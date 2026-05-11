import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return 'Sin registrar';
  return date.toISOString().split('T')[0];
};

export class AlmacenamientoService {

  // ─── Instrumentos disponibles en Inventario ───────────────
  static async obtenerInstrumentos() {
    const stock = await prisma.inventario.findMany({
      where: { instrumentoId: { not: null }, estado: 'Disponible' },
      include: {
        instrumento: {
          include: { especialidad: true, subespecialidad: true, tipo: true, kit: true }
        }
      },
      orderBy: { fechaVencimiento: 'asc' }
    });

    return stock.map(item => ({
      id:                  item.id,
      fechaVencimiento:    formatDate(item.fechaVencimiento),
      nombre:              item.instrumento?.nombre               || 'N/A',
      kit:                 item.instrumento?.kit?.codigoKit       || 'Individual',
      especialidad:        item.instrumento?.especialidad?.nombre || 'N/A',
      subEspecialidad:     item.instrumento?.subespecialidad?.nombre || 'N/A',
      tipoSubEspecialidad: item.instrumento?.tipo?.nombre         || 'N/A',
      tipo:                'Instrumento' as const,
    }));
  }

  // ─── Kits disponibles en Inventario ──────────────────────
  static async obtenerKits() {
    const stock = await prisma.inventario.findMany({
      where: { kitId: { not: null }, estado: 'Disponible' },
      include: {
        kit: { include: { especialidad: true, subespecialidad: true } }
      },
      orderBy: { fechaVencimiento: 'asc' }
    });

    return stock.map(item => ({
      id:                  item.id,
      fechaVencimiento:    formatDate(item.fechaVencimiento),
      kit:                 item.kit?.codigoKit                    || 'N/A',
      nombre:              item.kit?.nombre                       || 'N/A',
      especialidad:        item.kit?.especialidad?.nombre         || 'N/A',
      subEspecialidad:     item.kit?.subespecialidad?.nombre      || 'N/A',
      tipoSubEspecialidad: item.kit?.tipoSubespecialidad          || 'N/A',
      tipo:                'Kit' as const,
    }));
  }

  // ─── Insumos — historial de movimientos ──────────────────
  static async obtenerInsumos() {
    const detalles = await prisma.detalleMovimientoAlmacen.findMany({
      where: { insumoId: { not: null } },
      include: {
        movimiento: true,
        insumo: { include: { unidadMedida: true, presentacion: true, proveedor: true } }
      },
      orderBy: { movimiento: { fechaMovimiento: 'desc' } }
    });

    return detalles.map(det => ({
      id:                     det.id,
      codigo:                 det.insumo?.codigo                 || 'N/A',
      nombre:                 det.insumo?.nombre                 || 'N/A',
      fechaVencimiento:       formatDate(det.movimiento.fechaMovimiento),
      tipoMovimiento:         det.movimiento.tipoMovimiento === 'Consumo' ? 'Consumido' : 'Solicitado',
      requiereEsterilizacion: det.insumo?.requiereEsterilizacion || false,
      tipoEsterilizacion:     det.insumo?.tipoEsterilizacion     || 'No aplica',
      unidadMedida:           det.insumo?.unidadMedida?.nombre   || 'Unidad',
      presentacion:           det.insumo?.presentacion?.nombre   || 'N/A',
      proveedor:              det.insumo?.proveedor?.nombre      || 'N/A',
      cantidad:               det.cantidad,
    }));
  }

  // ─── Historial de préstamos (Envios a Quirófano) ─────────
  static async obtenerHistorialPrestamos() {
    const movimientos = await prisma.movimientoAlmacen.findMany({
      where: { tipoMovimiento: 'Envio_Quirofano' },
      include: {
        quirofano: true,
        detalles: {
          include: {
            kit:        { include: { especialidad: true, subespecialidad: true } },
            instrumento: { include: { especialidad: true, subespecialidad: true, tipo: true } }
          }
        }
      },
      orderBy: { fechaMovimiento: 'desc' }
    });

    return movimientos.flatMap(mov =>
      mov.detalles.map(det => ({
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
  }

  // ─── Enviar kit/instrumento a quirófano ──────────────────
  static async enviarSetQuirofano(payload: {
    kitId: number;
    quirofanoId: number;
    estado: string;
    instrumentadorId?: number | null;
    responsableId: number;
  }) {
    return await prisma.$transaction(async (tx) => {
      const itemInventario = await tx.inventario.findUnique({
        where: { id: payload.kitId }
      });

      if (!itemInventario || itemInventario.estado !== 'Disponible') {
        throw new Error('El elemento seleccionado no está disponible en el almacén.');
      }

      await tx.inventario.update({
        where: { id: itemInventario.id },
        data:  { estado: 'En Quirófano' }
      });

      return await tx.movimientoAlmacen.create({
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

  // ─── Registrar solicitud o consumo de insumos ────────────
  static async registrarMovimientoInsumo(
    tipo: string,
    payload: {
      fecha: string;
      responsableId: number;
      sedeId: number;
      insumos: Array<{ insumoId: number; cantidad: number }>;
    }
  ) {
    const tipoMovimiento = tipo === 'consumo' ? 'Consumo' : 'Solicitud';

    return await prisma.$transaction(async (tx) => {
      if (tipoMovimiento === 'Consumo') {
        for (const item of payload.insumos) {
          const stockActual = await tx.inventario.findFirst({
            where: { insumoId: item.insumoId, estado: 'Disponible' }
          });

          if (!stockActual || stockActual.cantidad < item.cantidad) {
            throw new Error(
              `Stock insuficiente para el insumo ID ${item.insumoId}. Disponible: ${stockActual?.cantidad || 0}`
            );
          }

          const nuevaCantidad = stockActual.cantidad - item.cantidad;
          await tx.inventario.update({
            where: { id: stockActual.id },
            data: {
              cantidad: nuevaCantidad,
              estado:   nuevaCantidad === 0 ? 'Agotado' : 'Disponible'
            }
          });
        }
      }

      return await tx.movimientoAlmacen.create({
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
