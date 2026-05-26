import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReportesService {
  static async obtenerTodos(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    
    if (estadoFiltro) {
      whereClause.estado = estadoFiltro;
    }
    
    if (search) {
      whereClause.OR = [
        { codigo: { contains: search } },
        { instrumento: { nombre: { contains: search } } },
        { instrumento: { codigo: { contains: search } } },
        { instrumento: { especialidad: { nombre: { contains: search } } } },
        { reportadoPor: { nombre: { contains: search } } },
        { reportadoPor: { apellido: { contains: search } } }
      ];
    }

    // Traemos todos los registros que cumplen el filtro y ordenamos por estado
    // (Pendiente → En curso → Finalizado) y luego por fecha desc. La paginación
    // se hace en memoria porque el orden por estado es personalizado.
    const todos = await prisma.reporte.findMany({
      where: whereClause,
      include: {
        instrumento: {
          include: { especialidad: true, kit: true }
        },
        reportadoPor: { select: { nombre: true, apellido: true } },
        proveedorMantenimiento: { select: { nombre: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const prioridad: Record<string, number> = { 'Pendiente': 0, 'En curso': 1, 'Finalizado': 2 };
    todos.sort((a, b) => {
      const pa = prioridad[a.estado] ?? 99;
      const pb = prioridad[b.estado] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = todos.length;
    const reportes = todos.slice(skip, skip + limit);

    return { total, reportes };
  }

  static async crear(data: any, evidenciaFotoUrl: string | null) {
    // 1. Validar PIN
    const usuarioResponsable = await prisma.usuario.findFirst({
      where: { codigoVerificacion: String(data.codigoVerificacion), estado: true }
    });
    
    if (!usuarioResponsable) {
      throw new Error("PIN_INVALIDO");
    }

    // 2. Generar código REP-XXXX
    const count = await prisma.reporte.count();
    const codigoGenerado = `REP-${String(count + 1).padStart(4, '0')}`;

    // 3. Crear Reporte
    return await prisma.reporte.create({
      data: {
        codigo: codigoGenerado,
        instrumentoId: data.instrumentoId,
        tipoDano: data.tipoDano,
        descripcionDano: data.descripcionDano || null,
        evidenciaFotoUrl,
        reportadoPorId: usuarioResponsable.id,
        estado: "Pendiente"
      }
    });
  }

  static async gestionar(id: number, proveedorMantenimientoId: number, descripcionMantenimiento: string) {
    // Para asegurar consistencia de datos, podríamos usar una transacción, 
    // pero mantenemos tu flujo actual de 2 awaits.
    const reporteActualizado = await prisma.reporte.update({
      where: { id },
      data: {
        proveedorMantenimientoId,
        descripcionMantenimiento,
        estado: "En curso"
      }
    });

    await prisma.hojaVidaInstrumento.update({
      where: { id: reporteActualizado.instrumentoId },
      data: { estado: "En mantenimiento", estadoActual: "En mantenimiento" }
    });

    return reporteActualizado;
  }

  static async finalizar(id: number, destinoFinal: string, informeMantenimientoUrl: string) {
    const reporteFinalizado = await prisma.reporte.update({
      where: { id },
      data: {
        informeMantenimientoUrl,
        destinoFinal,
        estado: "Finalizado"
      }
    });

    const nuevoEstado = destinoFinal === "Reingreso" ? "Habilitado" : "De baja";
    
    await prisma.hojaVidaInstrumento.update({
      where: { id: reporteFinalizado.instrumentoId },
      data: { estado: nuevoEstado, estadoActual: nuevoEstado }
    });

    return { reporteFinalizado, nuevoEstado };
  }

  static async validarPin(pin: string) {
    return await prisma.usuario.findFirst({
      where: { codigoVerificacion: pin, estado: true }
    });
  }
}