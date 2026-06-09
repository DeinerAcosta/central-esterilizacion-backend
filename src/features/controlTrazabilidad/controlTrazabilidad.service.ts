import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Control Trazabilidad Qx — vista consolidada de la ubicación + estado actual
 * de cada instrumento y kit. Es información DERIVADA (no hay tabla nueva):
 *   - Instrumentos → HojaVidaInstrumento (estadoActual + sede + kit + updatedAt)
 *   - Kits        → Kit (estado + sede + updatedAt)
 *
 * Soporta filtros por rango de fechas (sobre updatedAt), ubicación (sedeId),
 * estado y texto de búsqueda (nombre/código).
 */

type FiltrosLista = {
  fechaDesde?: string;
  fechaHasta?: string;
  ubicacion?: string; // sedeId
  estado?: string;
  search?: string;
  limit?: number;
};

const parseLimit = (limit?: number) => Math.min(Math.max(Number(limit ?? 100) || 100, 1), 100000);

const rangoFechas = (fechaDesde?: string, fechaHasta?: string) => {
  const where: { gte?: Date; lte?: Date } = {};
  if (fechaDesde) where.gte = new Date(`${fechaDesde}T00:00:00`);
  if (fechaHasta) where.lte = new Date(`${fechaHasta}T23:59:59`);
  return Object.keys(where).length ? where : undefined;
};

export class ControlTrazabilidadService {
  /** Listado de instrumentos para "Control Trazabilidad Qx". */
  static async listarInstrumentos(f: FiltrosLista) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    const fecha = rangoFechas(f.fechaDesde, f.fechaHasta);
    if (fecha) where.updatedAt = fecha;
    if (f.ubicacion) where.sedeId = Number(f.ubicacion);
    if (f.estado) where.estadoActual = f.estado;
    if (f.search) {
      where.OR = [
        { nombre: { contains: f.search } },
        { codigo: { contains: f.search } },
        { numeroSerie: { contains: f.search } },
      ];
    }

    const rows = await prisma.hojaVidaInstrumento.findMany({
      where,
      include: {
        sede: { select: { id: true, nombre: true } },
        kit:  { select: { id: true, codigoKit: true } },
        especialidad: { select: { nombre: true } },
        subespecialidad: { select: { nombre: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: parseLimit(f.limit),
    });

    return rows.map((r, i) => ({
      no: i + 1,
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      kit: r.kit?.codigoKit ?? null,
      ubicacion: r.sede?.nombre ?? 'Sin asignar',
      ubicacionId: r.sede?.id ?? null,
      estado: r.estadoActual,
      especialidad: r.especialidad?.nombre ?? '',
      subespecialidad: r.subespecialidad?.nombre ?? '',
      fecha: r.updatedAt.toISOString().slice(0, 10),
      hora: r.updatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /** Listado de kits para "Control Trazabilidad Qx". */
  static async listarKits(f: FiltrosLista) {
    // El modelo Kit solo tiene createdAt — lo usamos como "última actualización".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    const fecha = rangoFechas(f.fechaDesde, f.fechaHasta);
    if (fecha) where.createdAt = fecha;
    if (f.ubicacion) where.sedeId = Number(f.ubicacion);
    if (f.estado) where.estado = f.estado;
    if (f.search) {
      where.OR = [
        { codigoKit: { contains: f.search } },
      ];
    }

    const rows = await prisma.kit.findMany({
      where,
      include: {
        sede: { select: { id: true, nombre: true } },
        especialidad: { select: { nombre: true } },
        subespecialidad: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseLimit(f.limit),
    });

    return rows.map((r, i) => ({
      no: i + 1,
      id: r.id,
      codigo: r.codigoKit,
      nombre: `Kit ${r.codigoKit}`,
      kit: r.codigoKit,
      ubicacion: r.sede?.nombre ?? 'Sin asignar',
      ubicacionId: r.sede?.id ?? null,
      estado: r.estado,
      especialidad: r.especialidad?.nombre ?? '',
      subespecialidad: r.subespecialidad?.nombre ?? '',
      fecha: r.createdAt.toISOString().slice(0, 10),
      hora: r.createdAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
      updatedAt: r.createdAt.toISOString(),
    }));
  }

  /** Detalle de instrumento — info que muestra el modal de detalle. */
  static async detalleInstrumento(id: number) {
    const r = await prisma.hojaVidaInstrumento.findUnique({
      where: { id },
      include: {
        sede: true, kit: true,
        especialidad: true, subespecialidad: true, tipo: true,
      },
    });
    if (!r) return null;
    return {
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      estado: r.estadoActual,
      especialidad: r.especialidad?.nombre ?? '',
      subespecialidad: r.subespecialidad?.nombre ?? '',
      tipo: r.tipo?.nombre ?? '',
      kit: r.kit?.codigoKit ?? null,
      ubicacion: r.sede?.nombre ?? 'Sin asignar',
      instrumentador: '—',
      fecha: r.updatedAt.toISOString().slice(0, 10),
      hora: r.updatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  }

  /** Detalle de kit. */
  static async detalleKit(id: number) {
    const r = await prisma.kit.findUnique({
      where: { id },
      include: {
        sede: true,
        especialidad: true, subespecialidad: true,
        hojasDeVida: { select: { id: true } },
      },
    });
    if (!r) return null;
    return {
      id: r.id,
      codigo: r.codigoKit,
      nombre: `Kit ${r.codigoKit}`,
      estado: r.estado,
      especialidad: r.especialidad?.nombre ?? '',
      subespecialidad: r.subespecialidad?.nombre ?? '',
      tipo: r.tipoSubespecialidad ?? '',
      kit: r.codigoKit,
      ubicacion: r.sede?.nombre ?? 'Sin asignar',
      instrumentador: '—',
      cantidadInstrumentos: r.hojasDeVida.length,
      fecha: r.createdAt.toISOString().slice(0, 10),
      hora: r.createdAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  }
}
