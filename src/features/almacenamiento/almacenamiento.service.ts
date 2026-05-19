import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return 'Sin registrar';
  return date.toISOString().split('T')[0];
};

// Acota el rango de paginación: page mínimo 1, limit en [1..100].
// Cualquier endpoint que reciba page/limit del cliente DEBE pasar por aquí.
const normalizarPaginacion = (page?: number, limit?: number) => {
  const safePage = Math.max(1, Number.isFinite(page) ? Number(page) : 1);
  const safeLimit = Math.min(100, Math.max(1, Number.isFinite(limit) ? Number(limit) : 20));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

export class AlmacenamientoService {

  // ── Instrumentos desde HojaVidaInstrumento (paginado) ─────────
  static async obtenerInstrumentos(pageInput?: number, limitInput?: number, search?: string) {
    const { page, limit, skip } = normalizarPaginacion(pageInput, limitInput);

    const where: Prisma.HojaVidaInstrumentoWhereInput = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { codigo: { contains: search } },
        { numeroSerie: { contains: search } },
      ];
    }

    const [total, instrumentos] = await Promise.all([
      prisma.hojaVidaInstrumento.count({ where }),
      prisma.hojaVidaInstrumento.findMany({
        where,
        include: {
          especialidad:    true,
          subespecialidad: true,
          tipo:            true,
          kit:             true,
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const data = instrumentos.map(inst => ({
      id:                  inst.id,
      fechaVencimiento:    formatDate(inst.proximoMantenimiento),
      nombre:              inst.nombre,
      kit:                 inst.kit?.codigoKit               || 'Individual',
      especialidad:        inst.especialidad?.nombre         || 'N/A',
      subEspecialidad:     inst.subespecialidad?.nombre      || 'N/A',
      tipoSubEspecialidad: inst.tipo?.nombre                 || 'N/A',
      tipo:                'Instrumento' as const,
    }));

    return { data, total, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  // ── Kits disponibles (paginado) ──────────────────────────────
  static async obtenerKits(pageInput?: number, limitInput?: number, search?: string) {
    const { page, limit, skip } = normalizarPaginacion(pageInput, limitInput);

    const where: Prisma.KitWhereInput = {};
    if (search) {
      where.OR = [
        { codigoKit: { contains: search } },
        { nombre: { contains: search } },
      ];
    }

    const [total, kits] = await Promise.all([
      prisma.kit.count({ where }),
      prisma.kit.findMany({
        where,
        include: {
          especialidad:    true,
          subespecialidad: true,
          ciclos: { orderBy: { id: 'desc' }, take: 1 }
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const data = kits.map(k => ({
      id:                  k.id,
      fechaVencimiento:    k.ciclos[0]?.almacFechaVencimiento || 'Sin ciclo previo',
      kit:                 k.codigoKit,
      nombre:              k.nombre,
      especialidad:        k.especialidad?.nombre            || 'N/A',
      subEspecialidad:     k.subespecialidad?.nombre         || 'N/A',
      tipoSubEspecialidad: k.tipoSubespecialidad             || 'N/A',
      tipo:                'Kit' as const,
    }));

    return { data, total, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  // ── Insumos: movimientos (Solicitud/Consumo) paginados +
  //    snapshot fijo de los últimos N consumos de ciclos.
  //    El listado de Almacenamiento se ordena por fecha desc.
  static async obtenerInsumos(pageInput?: number, limitInput?: number, search?: string) {
    const { page, limit, skip } = normalizarPaginacion(pageInput, limitInput);

    // Filtro de búsqueda aplicado al insumo relacionado.
    const movWhere: Prisma.MovimientoInsumoDetalleWhereInput | undefined = search
      ? { insumo: { OR: [{ nombre: { contains: search } }, { codigo: { contains: search } }] } }
      : undefined;

    // Tipo derivado con las relaciones incluidas. Si lo tipamos como
    // Awaited<...findMany()> Prisma devuelve la forma BASE sin includes.
    const detalleArgs = Prisma.validator<Prisma.MovimientoInsumoDetalleFindManyArgs>()({
      include: {
        movimiento: true,
        insumo: { include: { unidadMedida: true, presentacion: true, proveedor: true } },
      },
    });
    type DetalleConRelaciones = Prisma.MovimientoInsumoDetalleGetPayload<typeof detalleArgs>;

    let totalMov = 0;
    let detallesMov: DetalleConRelaciones[] = [];
    try {
      [totalMov, detallesMov] = await Promise.all([
        prisma.movimientoInsumoDetalle.count({ where: movWhere }),
        prisma.movimientoInsumoDetalle.findMany({
          ...detalleArgs,
          where: movWhere,
          orderBy: { id: 'desc' },
          skip,
          take: limit,
        }),
      ]);
    } catch {
      // Modelo no migrado todavía — seguimos sin movimientos.
    }

    const desdeMovimientos = detallesMov.map((det) => ({
      id:                     det.movimiento.id * 10000 + det.id,
      codigo:                 det.insumo.codigo,
      nombre:                 det.insumo.nombre,
      fechaVencimiento:       formatDate(det.movimiento.fecha),
      tipoMovimiento:         (det.movimiento.tipo === 'Consumo' ? 'Consumido' : 'Solicitado') as 'Consumido' | 'Solicitado',
      requiereEsterilizacion: det.insumo.requiereEsterilizacion,
      tipoEsterilizacion:     det.insumo.tipoEsterilizacion    || 'No aplica',
      unidadMedida:           det.insumo.unidadMedida?.nombre  || 'Unidad',
      presentacion:           det.insumo.presentacion?.nombre  || 'N/A',
      proveedor:              det.insumo.proveedor?.nombre     || 'N/A',
      cantidad:               det.cantidad,
    }));

    // Snapshot de los últimos 50 consumos de ciclos (no paginado, solo
    // contextual). Antes era take:100 sin filtro; se reduce a 50 para
    // evitar 30MB de respuesta cuando hay miles de ciclos.
    const insumoCicloWhere: Prisma.InsumoCicloWhereInput | undefined = search
      ? { insumo: { OR: [{ nombre: { contains: search } }, { codigo: { contains: search } }] } }
      : undefined;

    const insumosCiclo = await prisma.insumoCiclo.findMany({
      where: insumoCicloWhere,
      include: {
        insumo: { include: { unidadMedida: true, presentacion: true, proveedor: true } },
        ciclo:  true,
      },
      orderBy: { id: 'desc' },
      take: 50,
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

    const data = [...desdeMovimientos, ...desdeCiclos];
    return { data, total: totalMov, totalPages: Math.ceil(totalMov / limit), currentPage: page };
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