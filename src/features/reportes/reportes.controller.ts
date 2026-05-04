import { Request, Response } from 'express';
import { z } from 'zod';
import { ReportesService } from './reportes.service';
import { 
  createReporteSchema, 
  gestionarReporteSchema, 
  finalizarReporteSchema, 
  validarPinSchema 
} from './reportes.schema';

export const getReportes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, reportes } = await ReportesService.obtenerTodos(page, limit, search, estadoFiltro);

    res.json({ 
      data: reportes, 
      total, 
      totalPages: Math.ceil(total / limit), 
      currentPage: page 
    });
  } catch (error) {
    console.error("❌ Error al obtener reportes:", error);
    res.status(500).json({ msg: "Error al obtener los reportes" });
  }
};

export const createReporte = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validar Form-Data con Zod
    const dataValidada = createReporteSchema.parse(req.body);

    // 2. Extraer archivo de imagen
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const evidenciaFotoUrl = files?.['evidencia'] ? `/uploads/${files['evidencia'][0].filename}` : null;

    // 3. Ejecutar servicio
    const nuevoReporte = await ReportesService.crear(dataValidada, evidenciaFotoUrl);
    res.status(201).json({ msg: "Reporte creado exitosamente", data: nuevoReporte });
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: "Faltan campos obligatorios (Instrumento, Tipo de daño o PIN)." });
      return;
    }
    if (error.message === "PIN_INVALIDO") {
      res.status(403).json({ msg: "El código de verificación ingresado es incorrecto o el usuario está inactivo." });
      return;
    }
    console.error("❌ Error al crear reporte:", error);
    res.status(500).json({ msg: "Error interno al guardar el reporte" });
  }
};

export const gestionarReporte = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = gestionarReporteSchema.parse(req.body);

    const reporteActualizado = await ReportesService.gestionar(
      Number(id), 
      dataValidada.proveedorMantenimientoId, 
      dataValidada.descripcionMantenimiento
    );

    res.json({ msg: "Reporte en curso, el instrumento fue enviado a mantenimiento.", data: reporteActualizado });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: "Falta proveedor o descripción." });
      return;
    }
    console.error("❌ Error al gestionar reporte:", error);
    res.status(500).json({ msg: "Error al actualizar el reporte." });
  }
};

export const finalizarReporte = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = finalizarReporteSchema.parse(req.body);

    // Extraer PDF
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const informeMantenimientoUrl = files?.['informePdf'] ? `/uploads/${files['informePdf'][0].filename}` : null;
    
    if (!informeMantenimientoUrl) {
      res.status(400).json({ msg: "Es obligatorio adjuntar el informe en PDF y seleccionar un destino final." });
      return;
    }

    const { reporteFinalizado, nuevoEstado } = await ReportesService.finalizar(
      Number(id), 
      dataValidada.destinoFinal, 
      informeMantenimientoUrl
    );

    res.json({ msg: `Reporte finalizado. El instrumento pasó a estado: ${nuevoEstado}`, data: reporteFinalizado });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: "Es obligatorio adjuntar el informe en PDF y seleccionar un destino final." });
      return;
    }
    console.error("❌ Error al finalizar reporte:", error);
    res.status(500).json({ msg: "Error al finalizar el reporte." });
  }
};

export const validarPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = validarPinSchema.parse(req.body);
    const usuario = await ReportesService.validarPin(dataValidada.pin);
    
    if (!usuario) {
      res.status(404).json({ valid: false, msg: "PIN incorrecto o usuario inactivo." });
      return;
    }

    res.json({ 
      valid: true, 
      usuario: `${usuario.nombre} ${usuario.apellido}` 
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ valid: false });
      return;
    }
    res.status(500).json({ valid: false, msg: "Error al validar el PIN" });
  }
};