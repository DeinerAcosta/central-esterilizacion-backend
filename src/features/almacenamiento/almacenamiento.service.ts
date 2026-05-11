import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return 'Sin registrar';
  return date.toISOString().split('T')[0];
};

export class AlmacenamientoService {

  // ─── Instrumentos desde HojaVidaInstrumento ───────────────
  static async obtenerInstrumentos() {
    const instrumentos = await prisma.hojaVidaInstrumento.findMany({
      include: {
        especialidad:    true,
        subespecialidad: true,
        tipo:            true,
        kit:             true,
      },
      orderBy: { id: 'desc' }
    });

    return instrumentos.map(inst => ({
      id:                  inst.id,
      fechaVencimiento:    formatDate(inst.proximoMantenimiento),
      nombre:              inst.nombre,
      kit:                 inst.kit?.codigoKit               || 'Individual',
      especialidad:        inst.especialidad?.nombre         || 'N/A',
      subEspecialidad:     inst.subespecialidad?.nombre      || 'N/A',
      tipoSubEspecialidad: inst.tipo?.nombre                 || 'N/A',
      tipo:                'Instrumento' as const,
    }));
  }

  // ─── Kits disponibles ─────────────────────────────────────
  static async obtenerKits() {
    const kits = await prisma.kit.findMany({
      include: {
        especialidad:    true,
        subespecialidad: true,
        ciclos: { orderBy: { id: 'desc' }, take: 1 }
      },
      orderBy: { id: 'desc' }
    });

    return kits.map(k => ({
      id:                  k.id,
      fechaVencimiento:    k.ciclos[0]?.almacFechaVencimiento || 'Sin ciclo previo',
      kit:                 k.codigoKit,
      nombre:              k.nombre,
      especialidad:        k.especialidad?.nombre             || 'N/A',
      subEspecialidad:     k.subespecialidad?.nombre          || 'N/A',
      tipoSubEspecialidad: k.tipoSubespecialidad              || 'N/A',
      tipo:                'Kit' as const,
    }));
  }

  // ─── Insumos — historial desde InsumoCiclo ────────────────
  static async obtenerInsumos() {
    const insumosCiclo = await prisma.insumoCiclo.findMany({
      include: {
        insumo: { include: { unidadMedida: true, presentacion: true, proveedor: true } },
        ciclo:  true,
      },
      orderBy: { id: 'desc' }
    });

    return insumosCiclo.map(ic => ({
      id:                     ic.id,
      codigo:                 ic.insumo.codigo,
      nombre:                 ic.insumo.nombre,
      fechaVencimiento:       formatDate(ic.ciclo.updatedAt),
      tipoMovimiento:         'Consumido' as const,
      requiereEsterilizacion: ic.insumo.requiereEsterilizacion,
      tipoEsterilizacion:     ic.insumo.tipoEsterilizacion     || 'No aplica',
      unidadMedida:           ic.insumo.unidadMedida?.nombre   || 'Unidad',
      presentacion:           ic.insumo.presentacion?.nombre   || 'N/A',
      proveedor:              ic.insumo.proveedor?.nombre      || 'N/A',
      cantidad:               ic.cantidad,
    }));
  }

  // ─── Historial de préstamos desde MovimientoAlmacen ───────
  // Nota: si el modelo no existe en la BD, devuelve array vacío
  static async obtenerHistorialPrestamos() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaAny = prisma as any;
      if (!prismaAny.movimientoAlmacen) return [];

      const movimientos = await prismaAny.movimientoAlmacen.findMany({
        where:   { tipoMovimiento: 'Envio_Quirofano' },
        include: {
          quirofano: true,
          detalles: {
            include: {
              kit:         { include: { especialidad: true, subespecialidad: true } },
              instrumento: { include: { especialidad: true, subespecialidad: true, tipo: true } }
            }
          }
        },
        orderBy: { fechaMovimiento: 'desc' }
      });

      return movimientos.flatMap((mov: any) =>
        mov.detalles.map((det: any) => ({
          id:                  det.id,
          fechaPrestamo:       formatDate(mov.fechaMovimiento),
          nombre:              det.kit?.nombre || det.instrumento?.nombre || 'N/A',
          kit:                 det.kit?.codigoKit || null,
          especialidad:        det.kit?.especialidad?.nombre || det.instrumento?.especialidad?.nombre || 'N/A',
          subEspecialidad:     det.kit?.subespecialidad?.nombre || det.instrumento?.subespecialidad?.nombre || 'N/A',
          tipoSubEspecialidad: det.kit?.tipoSubespecialidad || det.instrumento?.tipo?.nombre || 'N/A',
          quirofano:           mov.quirofano?.nombre || 'N/A',
        }))
      );
    } catch {
      return [];
    }
  }

  // ─── Enviar set a quirófano ───────────────────────────────
  // Nota: si Inventario no existe en BD, lanza error descriptivo
  static async enviarSetQuirofano(payload: {
    kitId: number; quirofanoId: number; estado: string;
    instrumentadorId?: number | null; responsableId: number;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    if (!prismaAny.inventario) {
      throw new Error('El módulo de inventario no está disponible aún. Contacte al administrador.');
    }

    return await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txAny = tx as any;
      const itemInventario = await txAny.inventario.findUnique({ where: { id: payload.kitId } });

      if (!itemInventario || itemInventario.estado !== 'Disponible') {
        throw new Error('El elemento seleccionado no está disponible en el almacén.');
      }

      await txAny.inventario.update({
        where: { id: itemInventario.id },
        data:  { estado: 'En Quirófano' }
      });

      return await txAny.movimientoAlmacen.create({
        data: {
          tipoMovimiento:   'Envio_Quirofano',
          quirofanoId:      payload.quirofanoId,
          responsableId:    payload.responsableId,
          instrumentadorId: payload.instrumentadorId ?? null,
          detalles: {
            create: [{
              kitId:         itemInventario.kitId,
              instrumentoId: itemInventario.instrumentoId,
              cantidad:      1
            }]
          }
        }
      });
    });
  }

  // ─── Registrar solicitud o consumo ───────────────────────
  static async registrarMovimientoInsumo(
    tipo: string,
    payload: {
      fecha: string; responsableId: number; sedeId: number;
      insumos: Array<{ insumoId: number; cantidad: number }>;
    }
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    if (!prismaAny.movimientoAlmacen) {
      throw new Error('El módulo de movimientos no está disponible aún.');
    }

    const tipoMovimiento = tipo === 'consumo' ? 'Consumo' : 'Solicitud';

    return await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txAny = tx as any;

      if (tipoMovimiento === 'Consumo') {
        for (const item of payload.insumos) {
          const stockActual = await txAny.inventario.findFirst({
            where: { insumoId: item.insumoId, estado: 'Disponible' }
          });
          if (!stockActual || stockActual.cantidad < item.cantidad) {
            throw new Error(`Stock insuficiente para el insumo ID ${item.insumoId}. Disponible: ${stockActual?.cantidad || 0}`);
          }
          const nuevaCantidad = stockActual.cantidad - item.cantidad;
          await txAny.inventario.update({
            where: { id: stockActual.id },
            data:  { cantidad: nuevaCantidad, estado: nuevaCantidad === 0 ? 'Agotado' : 'Disponible' }
          });
        }
      }

      return await txAny.movimientoAlmacen.create({
        data: {
          tipoMovimiento,
          fechaMovimiento: new Date(payload.fecha),
          sedeDestinoId:   payload.sedeId,
          responsableId:   payload.responsableId,
          detalles: {
            create: payload.insumos.map(item => ({
              insumoId: item.insumoId,
              cantidad: item.cantidad
            }))
          }
        }
      });
    });
  }
}
