import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fmt = (d: Date) => d.toISOString().split('T')[0];

/** El modelo HistorialTraslado no guarda un estado explícito: se deriva de las fechas. */
const derivarEstado = (fechaDevolucion: Date): string =>
  fechaDevolucion.getTime() <= Date.now() ? 'Devuelto' : 'En Traslado';

interface ListarParams {
  page: number;
  limit: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

function rangoFecha(fechaDesde?: string, fechaHasta?: string): Prisma.DateTimeFilter | undefined {
  if (!fechaDesde && !fechaHasta) return undefined;
  const filtro: Prisma.DateTimeFilter = {};
  if (fechaDesde) filtro.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
  if (fechaHasta) filtro.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
  return filtro;
}

/**
 * Servicio del módulo Informes — Historial de Traslados.
 * Lee del modelo HistorialTraslado (sedeOrigen/sedeDestino + kit o instrumento).
 */
export class HistorialTrasladosService {
  // ─── TRASLADOS DE KITS ──────────────────────────────────
  static async listarKits(params: ListarParams) {
    const { page, limit, search, fechaDesde, fechaHasta } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.HistorialTrasladoWhereInput = { kitId: { not: null } };
    const fecha = rangoFecha(fechaDesde, fechaHasta);
    if (fecha) where.fechaTraslado = fecha;
    if (search) where.kit = { codigoKit: { contains: search } };

    const [total, traslados] = await Promise.all([
      prisma.historialTraslado.count({ where }),
      prisma.historialTraslado.findMany({
        where,
        skip,
        take: limit,
        include: {
          sedeOrigen: true,
          sedeDestino: true,
          kit: {
            include: {
              especialidad: true,
              subespecialidad: true,
              _count: { select: { instrumentos: true } },
            },
          },
        },
        orderBy: { fechaTraslado: 'desc' },
      }),
    ]);

    const data = traslados.map((t) => ({
      id: t.id,
      fechaT: fmt(t.fechaTraslado),
      fechaD: fmt(t.fechaDevolucion),
      origen: t.sedeOrigen.nombre,
      destino: t.sedeDestino.nombre,
      esp: t.kit?.especialidad.nombre ?? '—',
      sub: t.kit?.subespecialidad.nombre ?? '—',
      tipo: t.kit?.tipoSubespecialidad ?? '—',
      codigoKit: t.kit?.codigoKit ?? '—',
      cantInstr: t.kit?._count.instrumentos ?? 0,
      estado: derivarEstado(t.fechaDevolucion),
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  // ─── TRASLADOS DE INSTRUMENTOS ──────────────────────────
  static async listarInstrumentos(params: ListarParams) {
    const { page, limit, search, fechaDesde, fechaHasta } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.HistorialTrasladoWhereInput = { instrumentoId: { not: null } };
    const fecha = rangoFecha(fechaDesde, fechaHasta);
    if (fecha) where.fechaTraslado = fecha;
    if (search) {
      where.instrumento = {
        OR: [{ nombre: { contains: search } }, { codigo: { contains: search } }],
      };
    }

    const [total, traslados] = await Promise.all([
      prisma.historialTraslado.count({ where }),
      prisma.historialTraslado.findMany({
        where,
        skip,
        take: limit,
        include: { sedeOrigen: true, sedeDestino: true, instrumento: true },
        orderBy: { fechaTraslado: 'desc' },
      }),
    ]);

    const data = traslados.map((t) => ({
      id: t.id,
      fechaT: fmt(t.fechaTraslado),
      fechaD: fmt(t.fechaDevolucion),
      origen: t.sedeOrigen.nombre,
      destino: t.sedeDestino.nombre,
      nombre: t.instrumento?.nombre ?? '—',
      codigo: t.instrumento?.codigo ?? '—',
      responsable: t.realizadoPor ?? '—',
      estado: derivarEstado(t.fechaDevolucion),
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  // ─── CONTENIDO DE UN KIT TRASLADADO (vista detalle) ─────
  static async obtenerContenidoKit(trasladoId: number) {
    const traslado = await prisma.historialTraslado.findUnique({
      where: { id: trasladoId },
      include: {
        kit: {
          include: {
            especialidad: true,
            subespecialidad: true,
            instrumentos: { include: { instrumento: true } },
          },
        },
      },
    });
    if (!traslado || !traslado.kit) throw new Error('TRASLADO_KIT_NO_ENCONTRADO');

    const { kit } = traslado;
    return {
      id: traslado.id,
      codigoKit: kit.codigoKit,
      fechaT: fmt(traslado.fechaTraslado),
      esp: kit.especialidad.nombre,
      sub: kit.subespecialidad.nombre,
      tipo: kit.tipoSubespecialidad,
      contenido: kit.instrumentos.map((ie) => ({
        codigo: ie.instrumento.codigo,
        nombre: ie.instrumento.nombre,
        instr: ie.instrumento.numeroSerie,
      })),
    };
  }
}
