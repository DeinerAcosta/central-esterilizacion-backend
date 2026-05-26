import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fmt = (d: Date) => d.toISOString().split('T')[0];

/**
 * Tipo de esterilización (campo CicloEsterilizacion.tipoEsterilizacion) asociado
 * a cada pantalla de indicadores de Informes.
 */
const TIPO_POR_INDICADOR = {
  biologico: 'Statim 2000S',
  gas: 'Óxido de etileno',
} as const;

export type TipoIndicador = keyof typeof TIPO_POR_INDICADOR;

interface ListarParams {
  page: number;
  limit: number;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

/**
 * Servicio del módulo Informes — Indicadores (Biológico / Gas).
 * Deriva los reportes de los ciclos de esterilización según su tipo.
 */
export class IndicadoresService {
  static async listar(tipo: TipoIndicador, params: ListarParams) {
    const { page, limit, search, fechaDesde, fechaHasta } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CicloEsterilizacionWhereInput = {
      tipoEsterilizacion: TIPO_POR_INDICADOR[tipo],
    };

    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      if (fechaHasta) where.createdAt.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
    }

    if (search) {
      where.OR = [
        { codigoCiclo: { contains: search } },
        { lote: { contains: search } },
        { kit: { codigoKit: { contains: search } } },
      ];
    }

    const [total, ciclos] = await Promise.all([
      prisma.cicloEsterilizacion.count({ where }),
      prisma.cicloEsterilizacion.findMany({
        where,
        skip,
        take: limit,
        include: { kit: true, responsable: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data = ciclos.map((c) => ({
      id: c.id,
      fecha: fmt(c.createdAt),
      codigoCiclo: c.codigoCiclo,
      lote: c.lote ?? '—',
      valorIndicador: c.valorIndicador ?? '—',
      indicadorUrl: c.indicadorUrl,
      kit: c.kit?.codigoKit ?? '—',
      responsable: c.responsable ? `${c.responsable.nombre} ${c.responsable.apellido}` : '—',
      estado: c.estadoGlobal,
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  // ─── PAQUETES E INSTRUMENTALES ──────────────────────────
  static async listarPaquetes(params: ListarParams) {
    const { page, limit, search, fechaDesde, fechaHasta } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.IndicadorPaqueteWhereInput = {};
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      if (fechaHasta) where.fecha.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
    }
    if (search) {
      where.OR = [
        { codigo: { contains: search } },
        { responsable: { contains: search } },
        { nombrePaciente: { contains: search } },
        { kit: { contains: search } },
        { equipo: { contains: search } },
        { intervencion: { contains: search } },
      ];
    }

    const [total, registros] = await Promise.all([
      prisma.indicadorPaquete.count({ where }),
      prisma.indicadorPaquete.findMany({ where, skip, take: limit, orderBy: { fecha: 'desc' } }),
    ]);

    const data = registros.map((r) => ({
      id: r.id,
      codigo: r.codigo ?? String(r.id).padStart(4, '0'),
      fecha: fmt(r.fecha),
      hora: r.hora ?? '—',
      nombre: r.nombrePaciente,
      nombreOftalmologo: r.nombreOftalmologo ?? '—',
      nombreInstrumentador: r.nombreInstrumentador ?? '—',
      responsable: r.responsable ?? '—',
      interv: r.intervencion,
      qui: r.quirofano,
      equipo: r.equipo,
      kit: r.kit,
      cant: String(r.cantidad),
      indPaqueteUrl: r.indPaqueteUrl,
      indInstrumentalUrl: r.indInstrumentalUrl,
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  // ─── PRIMERA CARGA ──────────────────────────────────────
  static async listarPrimeraCarga(params: ListarParams) {
    const { page, limit, search, fechaDesde, fechaHasta } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.IndicadorPrimeraCargaWhereInput = {};
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      if (fechaHasta) where.fecha.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
    }
    if (search) {
      where.OR = [{ lote: { contains: search } }, { equipo: { contains: search } }];
    }

    const [total, registros] = await Promise.all([
      prisma.indicadorPrimeraCarga.count({ where }),
      prisma.indicadorPrimeraCarga.findMany({ where, skip, take: limit, orderBy: { fecha: 'desc' } }),
    ]);

    const data = registros.map((r, idx) => ({
      no: skip + idx + 1,
      id: r.id,
      fecha: fmt(r.fecha),
      lote: r.lote,
      equipo: r.equipo ?? '—',
      instrumental: r.instrumental ?? '—',
      temp: r.temperatura,
      presion: r.librasPresion,
      inicio: r.horaInicio,
      salida: r.horaSalida,
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  // ─── DETALLE DE UN INDICADOR (Statim / Autoclave) ───────
  // El indicador ES un ciclo de esterilización; devolvemos su detalle completo
  // con kit, especialidad/subesp/tipo, evidencia e instrumentos del proceso.
  static async obtenerDetalle(id: number) {
    const c = await prisma.cicloEsterilizacion.findUnique({
      where: { id },
      include: {
        responsable: true,
        kit: {
          include: {
            especialidad: true,
            subespecialidad: true,
            instrumentos: { include: { instrumento: true } },
          },
        },
      },
    });
    if (!c) throw new Error('INDICADOR_NO_ENCONTRADO');

    // Agrupar instrumentos del kit por código (Cantidad + Instrumento)
    const agrupados = new Map<string, { codigo: string; nombre: string; cantidad: number }>();
    for (const ie of c.kit?.instrumentos ?? []) {
      const key = ie.instrumento.codigo;
      const ex = agrupados.get(key);
      if (ex) ex.cantidad += 1;
      else agrupados.set(key, { codigo: ie.instrumento.codigo, nombre: ie.instrumento.nombre, cantidad: 1 });
    }

    return {
      id: c.id,
      fecha: fmt(c.createdAt),
      nombre: c.codigoCiclo,
      valor: c.valorIndicador ?? '—',
      evidenciaUrl: c.indicadorUrl,
      especialidad: c.kit?.especialidad.nombre ?? '—',
      subespecialidad: c.kit?.subespecialidad.nombre ?? '—',
      tipo: c.kit?.tipoSubespecialidad ?? '—',
      kit: c.kit?.codigoKit ?? '—',
      responsable: c.responsable ? `${c.responsable.nombre} ${c.responsable.apellido}` : '—',
      instrumentos: Array.from(agrupados.values()),
    };
  }
}
