import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fmt = (d: Date) => d.toISOString().split('T')[0];

/**
 * Estado a mostrar según el flujo del cliente.
 * Estados base: Pendiente / Recibido / En préstamo / Prórroga.
 * "Vencido" se deriva cuando un traslado en "En préstamo" o "Prórroga" ya pasó
 * su fecha de devolución (en Prórroga: la nueva fecha también puede vencer y
 * permite solicitar otra prórroga).
 */
const derivarEstado = (estadoBase: string, fechaDevolucion: Date): string => {
  const vencido = fechaDevolucion.getTime() < Date.now();
  if (vencido && (estadoBase === 'En préstamo' || estadoBase === 'Prórroga')) return 'Vencido';
  return estadoBase || 'Pendiente';
};

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
      horaT: t.fechaTraslado.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
      fechaD: fmt(t.fechaDevolucion),
      horaD: t.fechaDevolucion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
      origen: t.sedeOrigen.nombre,
      destino: t.sedeDestino.nombre,
      esp: t.kit?.especialidad.nombre ?? '—',
      sub: t.kit?.subespecialidad.nombre ?? '—',
      tipo: t.kit?.tipoSubespecialidad ?? '—',
      codigoKit: t.kit?.codigoKit ?? '—',
      cantInstr: t.kit?._count.instrumentos ?? 0,
      estado: derivarEstado(t.estado, t.fechaDevolucion),
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
      horaT: t.fechaTraslado.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
      fechaD: fmt(t.fechaDevolucion),
      horaD: t.fechaDevolucion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
      origen: t.sedeOrigen.nombre,
      destino: t.sedeDestino.nombre,
      nombre: t.instrumento?.nombre ?? '—',
      codigo: t.instrumento?.codigo ?? '—',
      responsable: t.realizadoPor ?? '—',
      estado: derivarEstado(t.estado, t.fechaDevolucion),
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  // ─── DETALLE DE UN TRASLADO (modal "Detalle", solo lectura) ──
  // Info general + dos posibles tablas:
  //  - kits asociados (Código KIT, KIT) — para estado "Recibido"
  //  - instrumentos con cantidad (Cantidad, Instrumento) — para
  //    "Pendiente", "En préstamo", "Prórroga", "Vencido" (doc)
  static async obtenerDetalle(trasladoId: number) {
    const t = await prisma.historialTraslado.findUnique({
      where: { id: trasladoId },
      include: {
        sedeOrigen: true,
        sedeDestino: true,
        kit: { include: { especialidad: true, subespecialidad: true } },
        // Cuando el traslado es de instrumento suelto (no kit), tomamos
        // esp/sub/tipo del instrumento mismo.
        instrumento: { include: { especialidad: true, subespecialidad: true, tipo: true } },
        instrumentosEstado: {
          include: { instrumento: { select: { codigo: true, nombre: true } } },
        },
      },
    });
    if (!t) throw new Error('TRASLADO_NO_ENCONTRADO');

    const kits = t.kit ? [{ codigoKit: t.kit.codigoKit, nombre: t.kit.nombre }] : [];

    // Agrupa por instrumento sumando cantidades, para no repetir filas
    // cuando un mismo instrumento aparece en varias entradas estado.
    const acum = new Map<number, { codigo: string; nombre: string; cantidad: number }>();
    for (const ie of t.instrumentosEstado) {
      const prev = acum.get(ie.instrumentoId);
      if (prev) prev.cantidad += ie.cantidad;
      else acum.set(ie.instrumentoId, {
        codigo: ie.instrumento.codigo,
        nombre: ie.instrumento.nombre,
        cantidad: ie.cantidad,
      });
    }
    // Fallback para traslados de instrumento suelto que aún no tienen un
    // TrasladoInstrumentoEstado creado: mostramos el instrumento directo.
    if (acum.size === 0 && t.instrumento) {
      acum.set(t.instrumento.id, {
        codigo: t.instrumento.codigo,
        nombre: t.instrumento.nombre,
        cantidad: 1,
      });
    }
    const instrumentos = Array.from(acum.values());

    return {
      id: t.id,
      origen: t.sedeOrigen.nombre,
      destino: t.sedeDestino.nombre,
      fechaT: fmt(t.fechaTraslado),
      fechaD: fmt(t.fechaDevolucion),
      esp:  t.kit?.especialidad.nombre   ?? t.instrumento?.especialidad?.nombre   ?? '—',
      sub:  t.kit?.subespecialidad.nombre ?? t.instrumento?.subespecialidad?.nombre ?? '—',
      tipo: t.kit?.tipoSubespecialidad    ?? t.instrumento?.tipo?.nombre           ?? '—',
      estado: derivarEstado(t.estado, t.fechaDevolucion),
      kits,
      instrumentos,
    };
  }

  // ─── ESTADO INSTRUMENTAL DE UN TRASLADO ─────────────────
  // Lista los instrumentos del traslado con su estado (Aprobado/Rechazado/
  // Pendiente). Usado por "Ver aprobado" y "Aprobar recibido".
  static async obtenerEstadoInstrumental(trasladoId: number, search?: string) {
    let traslado = await prisma.historialTraslado.findUnique({
      where: { id: trasladoId },
      include: {
        kit: true,
        instrumentosEstado: {
          include: {
            instrumento: { include: { especialidad: true, subespecialidad: true, tipo: true } },
          },
        },
      },
    });
    if (!traslado) throw new Error('TRASLADO_NO_ENCONTRADO');

    // Lazy init: si el traslado es de instrumento suelto y aún no tiene
    // TrasladoInstrumentoEstado, lo creamos con estado "Pendiente" para que
    // se pueda usar "Aprobar recibido". (Datos antiguos creados antes de
    // este flujo no se hidrataron al insertar el traslado.)
    if (traslado.instrumentosEstado.length === 0 && traslado.instrumentoId) {
      await prisma.trasladoInstrumentoEstado.create({
        data: {
          trasladoId: traslado.id,
          instrumentoId: traslado.instrumentoId,
          cantidad: 1,
          estado: 'Pendiente',
        },
      });
      traslado = await prisma.historialTraslado.findUnique({
        where: { id: trasladoId },
        include: {
          kit: true,
          instrumentosEstado: {
            include: {
              instrumento: { include: { especialidad: true, subespecialidad: true, tipo: true } },
            },
          },
        },
      });
      if (!traslado) throw new Error('TRASLADO_NO_ENCONTRADO');
    }

    const fechaT = fmt(traslado.fechaTraslado);
    const fechaD = fmt(traslado.fechaDevolucion);
    const kitCodigo = traslado.kit?.codigoKit ?? '—';

    let items = traslado.instrumentosEstado.map((ie) => ({
      id: ie.id,
      instrumentoId: ie.instrumentoId,
      fechaT,
      fechaD,
      codigo: ie.instrumento.codigo,
      nombre: ie.instrumento.nombre,
      fotoUrl: ie.instrumento.fotoUrl,
      esp: ie.instrumento.especialidad.nombre,
      sub: ie.instrumento.subespecialidad.nombre,
      tipo: ie.instrumento.tipo.nombre,
      kit: kitCodigo,
      estado: ie.estado,
      cantidad: ie.cantidad,
      tipoDano: ie.tipoDano,
      descripcion: ie.descripcion,
    }));

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q));
    }

    return {
      id: traslado.id,
      estado: derivarEstado(traslado.estado, traslado.fechaDevolucion),
      items,
    };
  }

  // ─── GUARDAR APROBACIÓN DEL ESTADO INSTRUMENTAL ─────────
  // Actualiza el estado (Aprobado/Rechazado) de cada instrumento del traslado.
  // Cuando ya no quedan instrumentos "Pendiente", el traslado pasa a "Recibido".
  static async guardarAprobacionInstrumental(
    trasladoId: number,
    items: { id: number; estado: string; tipoDano?: string | null; descripcion?: string | null }[],
  ) {
    const traslado = await prisma.historialTraslado.findUnique({ where: { id: trasladoId } });
    if (!traslado) throw new Error('TRASLADO_NO_ENCONTRADO');

    // Normaliza el estado (la vista de Trazabilidad usa minúsculas).
    const normalizar = (e: string) => {
      const v = e.toLowerCase();
      if (v === 'aprobado') return 'Aprobado';
      if (v === 'rechazado') return 'Rechazado';
      return 'Pendiente';
    };

    await prisma.$transaction(
      items.map((it) =>
        prisma.trasladoInstrumentoEstado.update({
          where: { id: it.id },
          data: {
            estado: normalizar(it.estado),
            tipoDano: it.tipoDano ?? null,
            descripcion: it.descripcion ?? null,
          },
        }),
      ),
    );

    // Si ningún instrumento queda "Pendiente", el traslado se marca "Recibido".
    const pendientes = await prisma.trasladoInstrumentoEstado.count({
      where: { trasladoId, estado: 'Pendiente' },
    });
    if (pendientes === 0) {
      await prisma.historialTraslado.update({ where: { id: trasladoId }, data: { estado: 'Recibido' } });
    }

    return this.obtenerEstadoInstrumental(trasladoId);
  }

  // ─── PRÓRROGA: actualizar fecha de devolución ───────────
  // Regla del cliente:
  //   - Desde "Vencido" → al solicitar prórroga el traslado pasa a "Prórroga"
  //   - Desde "Prórroga" (Ver detalle) → solo se actualiza la fecha, sigue en "Prórroga"
  static async actualizarProrroga(trasladoId: number, fechaDevolucion: string) {
    const traslado = await prisma.historialTraslado.findUnique({ where: { id: trasladoId } });
    if (!traslado) throw new Error('TRASLADO_NO_ENCONTRADO');

    await prisma.historialTraslado.update({
      where: { id: trasladoId },
      data: {
        fechaDevolucion: new Date(`${fechaDevolucion}T00:00:00.000Z`),
        estado: 'Prórroga',
      },
    });

    return this.obtenerDetalle(trasladoId);
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
