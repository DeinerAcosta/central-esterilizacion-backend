import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getReportes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
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
    const [total, reportes] = await Promise.all([
      prisma.reporte.count({ where: whereClause }),
      prisma.reporte.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          instrumento: {
            include: { especialidad: true, kit: true }
          },
          reportadoPor: { select: { nombre: true, apellido: true } },
          proveedorMantenimiento: { select: { nombre: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({ data: reportes, total, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    console.error("❌ Error al obtener reportes:", error);
    res.status(500).json({ msg: "Error al obtener los reportes" });
  }
};

export const createReporte = async (req: Request, res: Response) => {
  try {
    const { instrumentoId, tipoDano, descripcionDano, codigoVerificacion } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const evidenciaFotoUrl = files?.['evidencia'] ? `/uploads/${files['evidencia'][0].filename}` : null;
    if (!instrumentoId || !tipoDano || !codigoVerificacion) {
      return res.status(400).json({ msg: "Faltan campos obligatorios (Instrumento, Tipo de daño o PIN)." });
    }
    const usuarioResponsable = await prisma.usuario.findFirst({
      where: { codigoVerificacion: String(codigoVerificacion), estado: true }
    });
    if (!usuarioResponsable) {
      return res.status(403).json({ msg: "El código de verificación ingresado es incorrecto o el usuario está inactivo." });
    }
    const count = await prisma.reporte.count();
    const codigoGenerado = `REP-${String(count + 1).padStart(4, '0')}`;
    const nuevoReporte = await prisma.reporte.create({
      data: {
        codigo: codigoGenerado,
        instrumentoId: Number(instrumentoId),
        tipoDano: String(tipoDano),
        descripcionDano: descripcionDano ? String(descripcionDano) : null,
        evidenciaFotoUrl,
        reportadoPorId: usuarioResponsable.id,
        estado: "Pendiente"
      }
    });
    res.status(201).json({ msg: "Reporte creado exitosamente", data: nuevoReporte });
  } catch (error) {
    console.error("❌ Error al crear reporte:", error);
    res.status(500).json({ msg: "Error interno al guardar el reporte" });
  }
};

export const gestionarReporte = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { proveedorMantenimientoId, descripcionMantenimiento } = req.body;
    if (!proveedorMantenimientoId || !descripcionMantenimiento) {
      return res.status(400).json({ msg: "Falta proveedor o descripción." });
    }
    const reporteActualizado = await prisma.reporte.update({
      where: { id: Number(id) },
      data: {
        proveedorMantenimientoId: Number(proveedorMantenimientoId),
        descripcionMantenimiento: String(descripcionMantenimiento),
        estado: "En curso"
      }
    });
    await prisma.hojaVidaInstrumento.update({
      where: { id: reporteActualizado.instrumentoId },
      data: { estado: "En mantenimiento", estadoActual: "En mantenimiento" }
    });
    res.json({ msg: "Reporte en curso, el instrumento fue enviado a mantenimiento.", data: reporteActualizado });
  } catch (error) {
    console.error("❌ Error al gestionar reporte:", error);
    res.status(500).json({ msg: "Error al actualizar el reporte." });
  }
};

export const finalizarReporte = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { destinoFinal } = req.body; // "Reingreso" o "Control de bajas y retiros"
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const informeMantenimientoUrl = files?.['informePdf'] ? `/uploads/${files['informePdf'][0].filename}` : null;
    if (!destinoFinal || !informeMantenimientoUrl) {
      return res.status(400).json({ msg: "Es obligatorio adjuntar el informe en PDF y seleccionar un destino final." });
    }
    const reporteFinalizado = await prisma.reporte.update({
      where: { id: Number(id) },
      data: {
        informeMantenimientoUrl,
        destinoFinal: String(destinoFinal),
        estado: "Finalizado"
      }
    });
    const nuevoEstado = destinoFinal === "Reingreso" ? "Habilitado" : "De baja";
    await prisma.hojaVidaInstrumento.update({
      where: { id: reporteFinalizado.instrumentoId },
      data: { estado: nuevoEstado, estadoActual: nuevoEstado }
    });
    res.json({ msg: `Reporte finalizado. El instrumento pasó a estado: ${nuevoEstado}`, data: reporteFinalizado });
  } catch (error) {
    console.error("❌ Error al finalizar reporte:", error);
    res.status(500).json({ msg: "Error al finalizar el reporte." });
  }
};

export const validarPin = async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;    
    if (!pin) return res.status(400).json({ valid: false });
    const usuario = await prisma.usuario.findFirst({
      where: { codigoVerificacion: String(pin), estado: true }
    });
    if (!usuario) {
      return res.status(404).json({ valid: false, msg: "PIN incorrecto o usuario inactivo." });
    }
    res.json({ 
      valid: true, 
      usuario: `${usuario.nombre} ${usuario.apellido}` 
    });
  } catch (error) {
    res.status(500).json({ valid: false, msg: "Error al validar el PIN" });
  }
};