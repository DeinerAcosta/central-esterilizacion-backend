import { Prisma, PrismaClient } from '@prisma/client';
import type { CrearIngresoInput, CrearDevolucionInput } from './terceros.schema';

const prisma = new PrismaClient();

/**
 * Servicio del módulo Informes — Instrumentos de 3ros.
 * Encapsula todas las consultas Prisma relacionadas con:
 *   - Entidades externas
 *   - Ingresos de instrumentos de terceros
 *   - Devoluciones (parciales o completas)
 *   - Instrumentos disponibles para asociar
 */
export class TercerosService {
  // ───────────────────────────────────────────────────────
  // ENTIDADES
  // ───────────────────────────────────────────────────────
  static async listarEntidades() {
    return prisma.entidad.findMany({
      where: { estado: true },
      orderBy: { nombre: 'asc' },
    });
  }

  static async crearEntidad(data: { nombre: string; nit?: string; contacto?: string }) {
    const count = await prisma.entidad.count();
    const codigo = `ENT-${String(count + 1).padStart(2, '0')}`;
    return prisma.entidad.create({
      data: {
        codigo,
        nombre: data.nombre,
        nit: data.nit ?? null,
        contacto: data.contacto ?? null,
        estado: true,
      },
    });
  }

  // ───────────────────────────────────────────────────────
  // INGRESOS
  // ───────────────────────────────────────────────────────
  static async listarIngresos(params: {
    page: number;
    limit: number;
    idRecepcion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const { page, limit, idRecepcion, fechaDesde, fechaHasta } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.IngresoTerceroWhereInput = {};

    if (idRecepcion) where.idRecepcion = { contains: idRecepcion };

    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      if (fechaHasta) where.fecha.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
    }

    const [total, ingresos] = await Promise.all([
      prisma.ingresoTercero.count({ where }),
      prisma.ingresoTercero.findMany({
        where,
        skip,
        take: limit,
        include: {
          entidad: true,
          instrumentos: true,
        },
        orderBy: { fecha: 'desc' },
      }),
    ]);

    const data = ingresos.map((ing) => ({
      id: ing.id,
      idRecepcion: ing.idRecepcion,
      fecha: ing.fecha.toISOString().split('T')[0],
      hora: ing.hora,
      entidad: ing.entidad.nombre,
      entidadId: ing.entidadId,
      cantidadIngresada: ing.instrumentos.reduce((sum, i) => sum + i.cantidad, 0),
      evidenciaUrl: ing.evidenciaUrl,
      estado: ing.estado,
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  static async obtenerIngreso(id: number) {
    const ingreso = await prisma.ingresoTercero.findUnique({
      where: { id },
      include: {
        entidad: true,
        instrumentos: {
          include: { instrumento: true },
        },
      },
    });
    if (!ingreso) throw new Error('INGRESO_NO_ENCONTRADO');

    return {
      id: ingreso.id,
      idRecepcion: ingreso.idRecepcion,
      fecha: ingreso.fecha.toISOString().split('T')[0],
      hora: ingreso.hora,
      entidad: ingreso.entidad,
      evidenciaUrl: ingreso.evidenciaUrl,
      estado: ingreso.estado,
      instrumentos: ingreso.instrumentos.map((it) => ({
        id: it.id,
        codigo: it.esRegistrado ? it.instrumento?.codigo : it.codigoExterno,
        nombre: it.esRegistrado ? it.instrumento?.nombre : it.nombreExterno,
        esRegistrado: it.esRegistrado,
        cantidad: it.cantidad,
        cantidadDevuelta: it.cantidadDevuelta,
        cantidadPendiente: it.cantidad - it.cantidadDevuelta,
      })),
    };
  }

  static async crearIngreso(data: CrearIngresoInput, evidenciaUrl: string | null) {
    return prisma.$transaction(async (tx) => {
      const ingreso = await tx.ingresoTercero.create({
        data: {
          idRecepcion: data.idRecepcion,
          fecha: new Date(data.fecha),
          hora: data.hora,
          entidadId: data.entidadId,
          evidenciaUrl,
          estado: 'Incompleto',
          instrumentos: {
            create: data.instrumentos.map((inst) => ({
              instrumentoId: inst.esRegistrado ? inst.instrumentoId ?? null : null,
              codigoExterno: inst.esRegistrado ? null : inst.codigoExterno ?? null,
              nombreExterno: inst.esRegistrado ? null : inst.nombreExterno ?? null,
              esRegistrado: inst.esRegistrado,
              cantidad: inst.cantidad,
            })),
          },
        },
        include: { instrumentos: true },
      });
      return ingreso;
    }, { maxWait: 15000, timeout: 30000 }); // BD remota (Aiven): evitar timeout P2028
  }

  // ───────────────────────────────────────────────────────
  // DEVOLUCIONES
  // ───────────────────────────────────────────────────────
  static async listarDevoluciones(params: {
    page: number;
    limit: number;
    idRecepcion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const { page, limit, idRecepcion, fechaDesde, fechaHasta } = params;
    const skip = (page - 1) * limit;

    // Listamos ingresos con su info de devolución agregada (el listado del frontend
    // muestra una fila por ingreso, con cant. ingresada vs cant. devuelta)
    const where: Prisma.IngresoTerceroWhereInput = {};
    if (idRecepcion) where.idRecepcion = { contains: idRecepcion };
    if (fechaDesde || fechaHasta) {
      where.updatedAt = {};
      if (fechaDesde) where.updatedAt.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      if (fechaHasta) where.updatedAt.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
    }

    const [total, ingresos] = await Promise.all([
      prisma.ingresoTercero.count({ where }),
      prisma.ingresoTercero.findMany({
        where,
        skip,
        take: limit,
        include: {
          entidad: true,
          instrumentos: true,
          devoluciones: { orderBy: { fechaSalida: 'desc' }, take: 1 },
        },
        // Prioridad: Incompletos arriba (estado 'desc': 'Incompleto' > 'Completo'),
        // y dentro de cada grupo por fecha/hora de última actividad (updatedAt desc).
        // Al pasar a 'Completo', el registro baja automáticamente bajo los incompletos.
        orderBy: [{ estado: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    const data = ingresos.map((ing) => {
      const cantidadIngresada = ing.instrumentos.reduce((s, i) => s + i.cantidad, 0);
      const cantidadDevuelta = ing.instrumentos.reduce((s, i) => s + i.cantidadDevuelta, 0);
      const pendientes = cantidadIngresada - cantidadDevuelta;
      const ultimaDev = ing.devoluciones[0];
      return {
        id: ing.id,
        idRecepcion: ing.idRecepcion,
        fechaSalida: ultimaDev?.fechaSalida.toISOString().split('T')[0] ?? null,
        hora: ultimaDev?.hora ?? null,
        entidad: ing.entidad.nombre,
        cantidadIngresada,
        cantidadDevuelta,
        pendientes,
        estado: pendientes === 0 ? 'Completo' : 'Incompleto',
      };
    });

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  static async obtenerInstrumentosPendientes(ingresoId: number) {
    const ingreso = await prisma.ingresoTercero.findUnique({
      where: { id: ingresoId },
      include: {
        instrumentos: { include: { instrumento: true } },
      },
    });
    if (!ingreso) throw new Error('INGRESO_NO_ENCONTRADO');

    return {
      idRecepcion: ingreso.idRecepcion,
      fecha: ingreso.fecha.toISOString().split('T')[0],
      hora: ingreso.hora,
      pendientes: ingreso.instrumentos
        .filter((it) => it.cantidad > it.cantidadDevuelta)
        .map((it) => ({
          id: it.id,
          codigo: it.esRegistrado ? it.instrumento?.codigo : it.codigoExterno,
          nombre: it.esRegistrado ? it.instrumento?.nombre : it.nombreExterno,
          cantidadPendiente: it.cantidad - it.cantidadDevuelta,
        })),
    };
  }

  static async crearDevolucion(ingresoId: number, data: CrearDevolucionInput) {
    return prisma.$transaction(async (tx) => {
      // Validar que las cantidades a devolver no superen las pendientes
      for (const det of data.detalles) {
        const it = await tx.instrumentoTercero.findUnique({
          where: { id: det.instrumentoTerceroId },
        });
        if (!it || it.ingresoId !== ingresoId) {
          throw new Error('INSTRUMENTO_FUERA_DE_INGRESO');
        }
        const pendiente = it.cantidad - it.cantidadDevuelta;
        if (det.cantidadDevuelta > pendiente) {
          throw new Error(`CANTIDAD_EXCEDE_PENDIENTE_${it.id}`);
        }
      }

      // Crear devolución + detalles
      const devolucion = await tx.devolucionTercero.create({
        data: {
          ingresoId,
          fechaSalida: new Date(data.fechaSalida),
          hora: data.hora,
          responsableId: data.responsableId ?? null,
          detalles: {
            create: data.detalles.map((d) => ({
              instrumentoTerceroId: d.instrumentoTerceroId,
              cantidadDevuelta: d.cantidadDevuelta,
            })),
          },
        },
      });

      // Actualizar cantidades devueltas en cada instrumento del ingreso
      for (const det of data.detalles) {
        await tx.instrumentoTercero.update({
          where: { id: det.instrumentoTerceroId },
          data: { cantidadDevuelta: { increment: det.cantidadDevuelta } },
        });
      }

      // Recalcular estado del ingreso
      const instrumentos = await tx.instrumentoTercero.findMany({ where: { ingresoId } });
      const totalIngresado = instrumentos.reduce((s, i) => s + i.cantidad, 0);
      const totalDevuelto = instrumentos.reduce((s, i) => s + i.cantidadDevuelta, 0);
      const nuevoEstado = totalDevuelto >= totalIngresado ? 'Completo' : 'Incompleto';

      await tx.ingresoTercero.update({
        where: { id: ingresoId },
        data: { estado: nuevoEstado },
      });

      return devolucion;
    }, { maxWait: 15000, timeout: 30000 }); // BD remota (Aiven): evitar timeout P2028
  }

  static async obtenerDevolucion(id: number) {
    const dev = await prisma.devolucionTercero.findUnique({
      where: { id },
      include: {
        ingreso: { include: { entidad: true, instrumentos: { include: { instrumento: true } } } },
        responsable: true,
        detalles: { include: { instrumentoTercero: { include: { instrumento: true } } } },
      },
    });
    if (!dev) throw new Error('DEVOLUCION_NO_ENCONTRADA');

    return {
      id: dev.id,
      idRecepcion: dev.ingreso.idRecepcion,
      fechaSalida: dev.fechaSalida.toISOString().split('T')[0],
      hora: dev.hora,
      entidad: dev.ingreso.entidad.nombre,
      responsable: dev.responsable
        ? `${dev.responsable.nombre} ${dev.responsable.apellido}`
        : null,
      instrumentos: dev.ingreso.instrumentos.map((it) => {
        const devueltoEnEsta = dev.detalles.find((d) => d.instrumentoTerceroId === it.id);
        return {
          id: it.id,
          codigo: it.esRegistrado ? it.instrumento?.codigo : it.codigoExterno,
          nombre: it.esRegistrado ? it.instrumento?.nombre : it.nombreExterno,
          cantidad: it.cantidad,
          estado: devueltoEnEsta ? 'Entregado' : 'Sin entregar',
        };
      }),
    };
  }

  // ───────────────────────────────────────────────────────
  // INSTRUMENTOS DISPONIBLES (para modal "Agregar instrumentos")
  // ───────────────────────────────────────────────────────
  static async listarInstrumentosDisponibles(params: {
    search?: string;
    especialidadId?: number;
    subespecialidadId?: number;
    page: number;
    limit: number;
  }) {
    const { search, especialidadId, subespecialidadId, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.HojaVidaInstrumentoWhereInput = { estado: 'Habilitado' };
    if (especialidadId) where.especialidadId = especialidadId;
    if (subespecialidadId) where.subespecialidadId = subespecialidadId;
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { codigo: { contains: search } },
      ];
    }

    const [total, instrumentos] = await Promise.all([
      prisma.hojaVidaInstrumento.count({ where }),
      prisma.hojaVidaInstrumento.findMany({
        where,
        skip,
        take: limit,
        include: {
          especialidad: true,
          subespecialidad: true,
          tipo: true,
          kit: true,
        },
        orderBy: { codigo: 'asc' },
      }),
    ]);

    const data = instrumentos.map((i) => ({
      id: i.id,
      codigo: i.codigo,
      nombre: i.nombre,
      especialidad: i.especialidad.nombre,
      subespecialidad: i.subespecialidad.nombre,
      tipo: i.tipo.nombre,
      kit: i.kit?.codigoKit ?? '-',
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }
}
