import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return 'Sin registrar';
  return date.toISOString().split('T')[0];
};

export class AlmacenamientoService {

  // ── Instrumentos desde HojaVidaInstrumento ───────────────────
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

  // ── Kits disponibles ─────────────────────────────────────────
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
      especialidad:        k.especialidad?.nombre            || 'N/A',
      subEspecialidad:     k.subespecialidad?.nombre         || 'N/A',
      tipoSubEspecialidad: k.tipoSubespecialidad             || 'N/A',
      tipo:                'Kit' as const,
    }));
  }

  // ── Insumos ── combina historial de InsumoCiclo + MovimientoInsumo ──
  static async obtenerInsumos() {
    // Historial de ciclos
    const insumosCiclo = await prisma.insumoCiclo.findMany({
      include: {
        insumo: { include: { unidadMedida: true, presentacion: true, proveedor: true } },
        ciclo:  true,
      },
      orderBy: { id: 'desc' },
      take: 100,
    });

    const desdeCiclos = insumosCiclo.map(ic => ({
      id:                     ic.id,
      codigo:                 ic.insumo.codigo,
      nombre:                 ic.insumo.nombre,
      fechaVencimiento:       formatDate(ic.ciclo.updatedAt),
      tipoMovimiento:         'Consumido' as const,
      requiereEsterilizacion: ic.insumo.requiereEsterilizacion,
      tipoEsterilizacion:     ic.insumo.tipoEsterilizacion    || 'No aplica',
      unidadMedida:           ic.insumo.unidadMedida?.nombre  || 'Unidad',
      presentacion:           ic.insumo.presentacion?.nombre  || 'N/A',
      proveedor:              ic.insumo.proveedor?.nombre     || 'N/A',
      cantidad:               ic.cantidad,
    }));

    // ✅ Movimientos de solicitud/consumo desde MovimientoInsumo (si existe el modelo)
    type InsumoRow = Omit<typeof desdeCiclos[0], 'tipoMovimiento'> & {
      tipoMovimiento: 'Consumido' | 'Solicitado';
    };
    let desdeMovimientos: InsumoRow[] = [];
    try {
      const movimientos = await prisma.movimientoInsumo.findMany({
        include: {
          detalles: {
            include: {
              insumo: { include: { unidadMedida: true, presentacion: true, proveedor: true } },
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      type DetalleMov = typeof movimientos[0]['detalles'][0];
      type MovMov     = typeof movimientos[0];
      desdeMovimientos = movimientos.flatMap((mov: MovMov) =>
        mov.detalles.map((det: DetalleMov, idx: number) => ({
          id:                     mov.id * 10000 + idx,
          codigo:                 det.insumo.codigo,
          nombre:                 det.insumo.nombre,
          fechaVencimiento:       formatDate(mov.fecha),
          tipoMovimiento:         (mov.tipo === 'Consumo' ? 'Consumido' : 'Solicitado') as 'Consumido' | 'Solicitado',
          requiereEsterilizacion: det.insumo.requiereEsterilizacion,
          tipoEsterilizacion:     det.insumo.tipoEsterilizacion    || 'No aplica',
          unidadMedida:           det.insumo.unidadMedida?.nombre  || 'Unidad',
          presentacion:           det.insumo.presentacion?.nombre  || 'N/A',
          proveedor:              det.insumo.proveedor?.nombre     || 'N/A',
          cantidad:               det.cantidad,
        }))
      );
    } catch {
      // MovimientoInsumo aún no migrado — continuar sin él
    }

    return [...desdeMovimientos, ...desdeCiclos];
  }

  // ── Historial de préstamos ────────────────────────────────────
  static async obtenerHistorialPrestamos() {
    try {
      const movimientos = await prisma.movimientoInsumo.findMany({
        include: {
          responsable: true,
          sede:        true,
          detalles: { include: { insumo: true } }
        },
        orderBy: { createdAt: 'desc' },
      });

      type MovHist = typeof movimientos[0];
      return movimientos.map((mov: MovHist) => ({
        id:            mov.id,
        fechaPrestamo: formatDate(mov.fecha),
        tipo:          mov.tipo,
        responsable:   `${mov.responsable.nombre} ${mov.responsable.apellido ?? ''}`.trim(),
        sede:          mov.sede.nombre,
        totalInsumos:  mov.detalles.length,
      }));
    } catch {
      return [];
    }
  }

  // ── Enviar set a quirófano ────────────────────────────────────
  static async enviarSetQuirofano(payload: {
    kitId: number; quirofanoId: number; estado: string;
    instrumentadorId?: number | null; responsableId: number;
  }) {
    // Verificar que el kit existe
    const kit = await prisma.kit.findUnique({ where: { id: payload.kitId } });
    if (!kit) throw new Error('El kit seleccionado no existe.');
    if (kit.estado !== 'Habilitado') throw new Error('El kit no está habilitado para envío.');

    // Crear un ciclo de distribución
    const ciclo = await prisma.cicloEsterilizacion.create({
      data: {
        codigoCiclo:           `ALM-${Date.now()}`,
        kitId:                 payload.kitId,
        etapaActual:           6,
        responsableActualId:   payload.responsableId,
        destinoSet:            'Distribución (A Quirófano)',
        quirofanoDestino:      String(payload.quirofanoId),
        instrumentadorDestino: payload.instrumentadorId ? String(payload.instrumentadorId) : null,
        estadoGlobal:          'Finalizado',
      }
    });

    return { id: ciclo.id };
  }

  // ── Registrar solicitud o consumo ─────────────────────────────
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

    // ✅ Verificar que los insumos existen
    for (const item of payload.insumos) {
      const insumo = await prisma.insumoQuirurgico.findUnique({ where: { id: item.insumoId } });
      if (!insumo) throw new Error(`Insumo ID ${item.insumoId} no encontrado.`);
    }

    // ✅ Crear el movimiento usando el modelo MovimientoInsumo
    const movimiento = await prisma.movimientoInsumo.create({
      data: {
        tipo:         tipoMovimiento,
        fecha:        new Date(payload.fecha),
        responsableId: payload.responsableId,
        sedeId:       payload.sedeId,
        detalles: {
          create: payload.insumos.map(item => ({
            insumoId: item.insumoId,
            cantidad: item.cantidad,
          }))
        }
      }
    });

    return { id: movimiento.id };
  }
}