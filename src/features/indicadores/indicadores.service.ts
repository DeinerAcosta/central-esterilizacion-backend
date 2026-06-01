import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fmt = (d: Date) => d.toISOString().split('T')[0];

// Hora del ciclo (formato 12h en es-CO: "08:35 a. m.").
const fmtHora = (d: Date) =>
  d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

/**
 * Tipos de esterilización (campo CicloEsterilizacion.tipoEsterilizacion) que
 * alimentan cada pantalla de indicadores en Informes.
 *  - "biologico" → equipos Statim 2000 y Statim 5000.
 *  - "gas"       → Óxido de etileno (autoclave).
 */
const TIPOS_POR_INDICADOR = {
  biologico: ['Statim 2000', 'Statim 5000'],
  gas: ['Gas', 'Vapor'],
} as const;

export type TipoIndicador = keyof typeof TIPOS_POR_INDICADOR;

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
      tipoEsterilizacion: { in: [...TIPOS_POR_INDICADOR[tipo]] },
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

    // Traemos todos los ciclos del rango/filtro y calculamos el correlativo
    // "#N" por (equipo, día) — ej: "Statim 2000 + 3" = la 3ª carga del Statim 2000 ese día.
    const todos = await prisma.cicloEsterilizacion.findMany({
      where,
      include: { kit: true, responsable: true },
      orderBy: { createdAt: 'asc' },
    });

    const contador = new Map<string, number>(); // key = `${equipo}|${fecha}`
    const enriquecidos = todos.map((c) => {
      const equipo = c.tipoEsterilizacion ?? '';
      const fecha = fmt(c.createdAt);
      const key = `${equipo}|${fecha}`;
      const n = (contador.get(key) ?? 0) + 1;
      contador.set(key, n);

      // Formato libreta de la clínica:
      //   Statim → Nombre="Statim",  Valor="{modelo} + {N}"  ej. "Statim" / "2000 + 3".
      //   Autoclave Gas/Vapor → Nombre="Gas|Vapor", Valor="+ {N}"  ej. "Gas" / "+ 2".
      let nombreFmt = equipo || c.codigoCiclo;
      let valorFmt = `+ ${n}`;
      if (equipo.startsWith('Statim ')) {
        nombreFmt = 'Statim';
        const modelo = equipo.replace('Statim ', '');
        valorFmt = `${modelo} + ${n}`;
      } else if (equipo) {
        nombreFmt = equipo; // 'Gas' o 'Vapor'
      }

      return {
        id: c.id,
        fecha,
        hora: fmtHora(c.createdAt),
        codigoCiclo: c.codigoCiclo,
        nombre: nombreFmt,
        lote: c.lote ?? '—',
        valorIndicador: valorFmt,
        resultado: c.valorIndicador ?? '—',
        indicadorUrl: c.indicadorUrl,
        kit: c.kit?.codigoKit ?? '—',
        responsable: c.responsable ? `${c.responsable.nombre} ${c.responsable.apellido}` : '—',
        estado: c.estadoGlobal,
        createdAt: c.createdAt,
      };
    });

    // Orden visible: más reciente primero. Y paginamos en memoria.
    enriquecidos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = enriquecidos.length;
    const data = enriquecidos.slice(skip, skip + limit).map((e) => ({
      id: e.id, fecha: e.fecha, hora: e.hora, codigoCiclo: e.codigoCiclo, nombre: e.nombre,
      lote: e.lote, valorIndicador: e.valorIndicador, resultado: e.resultado,
      indicadorUrl: e.indicadorUrl, kit: e.kit, responsable: e.responsable, estado: e.estado,
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
      prisma.indicadorPrimeraCarga.findMany({
        where, skip, take: limit, orderBy: { fecha: 'desc' },
        include: { responsable: { select: { nombre: true, apellido: true } } },
      }),
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
      responsable: r.responsable ? `${r.responsable.nombre} ${r.responsable.apellido}` : '—',
      integradorFisicoUrl: r.integradorFisicoUrl,
      indicadorBiologicoUrl: r.indicadorBiologicoUrl,
      indicadorQuimicoUrl: r.indicadorQuimicoUrl,
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  // ─── CREAR registro de Indicador de Primera Carga ──────
  // Valida el PIN del responsable, guarda los datos y las 3 evidencias.
  static async crearPrimeraCarga(payload: {
    codigoVerificacion: string;
    fecha: string;
    lote: string;
    equipo: string;
    instrumental: string;
    temperatura: string;
    librasPresion: string;
    horaInicio: string;
    horaSalida: string;
  }, files: { integradorFisico?: string; indicadorBiologico?: string; indicadorQuimico?: string }) {
    const usuario = await prisma.usuario.findFirst({
      where: { codigoVerificacion: String(payload.codigoVerificacion), estado: true },
    });
    if (!usuario) throw new Error('PIN_INVALIDO');

    const registro = await prisma.indicadorPrimeraCarga.create({
      data: {
        fecha: new Date(`${payload.fecha}T00:00:00.000Z`),
        lote: payload.lote,
        equipo: payload.equipo,
        instrumental: payload.instrumental,
        temperatura: payload.temperatura,
        librasPresion: payload.librasPresion,
        horaInicio: payload.horaInicio,
        horaSalida: payload.horaSalida,
        responsableId: usuario.id,
        integradorFisicoUrl: files.integradorFisico ?? null,
        indicadorBiologicoUrl: files.indicadorBiologico ?? null,
        indicadorQuimicoUrl: files.indicadorQuimico ?? null,
      },
    });
    return registro;
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

    // Calcular el correlativo "+N" y aplicar el formato libreta (Nombre/Valor).
    let nombreFmt = c.codigoCiclo;
    let valorFmt = c.valorIndicador ?? '—';
    if (c.tipoEsterilizacion) {
      const inicioDia = new Date(c.createdAt); inicioDia.setUTCHours(0, 0, 0, 0);
      const previos = await prisma.cicloEsterilizacion.count({
        where: {
          tipoEsterilizacion: c.tipoEsterilizacion,
          createdAt: { gte: inicioDia, lte: c.createdAt },
        },
      });
      if (c.tipoEsterilizacion.startsWith('Statim ')) {
        nombreFmt = 'Statim';
        const modelo = c.tipoEsterilizacion.replace('Statim ', '');
        valorFmt = `${modelo} + ${previos}`;
      } else {
        nombreFmt = c.tipoEsterilizacion;   // 'Gas' o 'Vapor'
        valorFmt = `+ ${previos}`;
      }
    }

    return {
      id: c.id,
      fecha: fmt(c.createdAt),
      hora: fmtHora(c.createdAt),
      nombre: nombreFmt,
      valor: valorFmt,
      resultado: c.valorIndicador ?? '—',
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
