import { Request, Response } from 'express';
import { z } from 'zod';
import { HojaVidasService } from './hojavidas.service';
import { TrasladosService } from './traslados.service';
import { 
    createHojaVidaSchema, registrarContableSchema, patchEstadoSchema, ejecutarTrasladoSchema 
} from './hojavidas.schema';

export const getHojasVida = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const search = req.query.search as string || '';

    const { total, hojas } = await HojaVidasService.obtenerTodas(page, limit, search, req.query);
    res.json({ data: hojas, total, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener las hojas de vida" });
  }
};

export const createHojaVida = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;   
    const fotoUrl = files?.['foto'] ? `/uploads/${files['foto'][0].filename}` : null;
    const garantiaUrl = files?.['garantia'] ? `/uploads/${files['garantia'][0].filename}` : null;
    const registroInvimaUrl = files?.['registroInvimaDoc'] ? `/uploads/${files['registroInvimaDoc'][0].filename}` : null;
    const codigoInstrumentoUrl = files?.['codigoInstrumentoDoc'] ? `/uploads/${files['codigoInstrumentoDoc'][0].filename}` : null;
    
    if (!fotoUrl || !garantiaUrl || !registroInvimaUrl || !codigoInstrumentoUrl) {
      res.status(400).json({ msg: "Faltan archivos adjuntos obligatorios." });
      return;
    }

    const dataValidada = createHojaVidaSchema.parse(req.body);
    
    const filesUrls = { fotoUrl, garantiaUrl, registroInvimaUrl, codigoInstrumentoUrl };
    const nuevaHoja = await HojaVidasService.crear(dataValidada, filesUrls);

    res.status(201).json({ msg: "Hoja de vida creada exitosamente", data: nuevaHoja });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.message === "ESPECIALIDAD_INVALIDA") {
      res.status(400).json({ msg: "Especialidad o subespecialidad inválida" });
      return;
    }
    res.status(500).json({ msg: "Error interno al guardar" });
  }
};

export const updateHojaVida = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dataValidada = createHojaVidaSchema.parse(req.body);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      
      const filesUrls: any = {};
      if (files?.['foto']?.[0]) filesUrls.fotoUrl = `/uploads/${files['foto'][0].filename}`;
      if (files?.['garantia']?.[0]) filesUrls.garantiaUrl = `/uploads/${files['garantia'][0].filename}`;
      if (files?.['registroInvimaDoc']?.[0]) filesUrls.registroInvimaUrl = `/uploads/${files['registroInvimaDoc'][0].filename}`;
      if (files?.['codigoInstrumentoDoc']?.[0]) filesUrls.codigoInstrumentoUrl = `/uploads/${files['codigoInstrumentoDoc'][0].filename}`;
  
      const hojaActualizada = await HojaVidasService.actualizar(Number(id), dataValidada, filesUrls);
      res.status(200).json({ msg: 'Actualizada correctamente', data: hojaActualizada });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ msg: error.issues[0].message });
        return;
      }
      res.status(500).json({ msg: "Error al actualizar" });
    }
};

export const registrarContable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = registrarContableSchema.parse(req.body);
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const facturaUrl = files?.['facturaDoc'] ? `/uploads/${files['facturaDoc'][0].filename}` : null;
    
    const hoja = await HojaVidasService.registrarContable(Number(id), dataValidada, facturaUrl);
    res.json({ msg: "Registro contable exitoso", data: hoja });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error en el registro contable" });
  }
};

export const patchEstadoHojaVida = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = patchEstadoSchema.parse(req.body); 
    
    const hoja = await HojaVidasService.cambiarEstado(Number(id), estado);
    res.json({ msg: "Estado actualizado", data: hoja });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
        res.status(400).json({ msg: error.issues[0].message });
        return;
    }
    if (error.message === "NO_ENCONTRADO") {
        res.status(404).json({ msg: "No encontrado" });
        return;
    }
    res.status(500).json({ msg: "Error al cambiar estado" });
  }
};

export const buscarPorCodigo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo } = req.query;
    if (!codigo || typeof codigo !== 'string') {
      res.status(400).json({ msg: 'El código es requerido' });
      return;
    }
    const instrumento = await HojaVidasService.buscarPorCodigo(codigo);
    if (!instrumento) {
      res.status(404).json({ msg: 'Instrumento no encontrado' });
      return;
    }
    res.json({ data: instrumento });
  } catch (error) {
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const getInventario = async (req: Request, res: Response) => {
  try {
    const data = await HojaVidasService.obtenerInventario(req.query);
    res.json({ data });
  } catch (error) {
    res.status(500).json({ msg: "Error en inventario" });
  }
};

export const getControlBajas = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string || '';
    
    const { total, bajas } = await HojaVidasService.obtenerBajas(page, 10, search, req.query);
    res.json({ data: bajas, total, totalPages: Math.ceil(total / 10), currentPage: page });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener bajas" });
  }
};

// TRASLADOS
export const getInventarioPorSede = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sedeId, tipoTraslado, especialidadId, subespecialidadId, tipoId } = req.query;
    if (!sedeId) {
        res.status(400).json({ msg: "Debe seleccionar una sede origen" });
        return;
    }
    
    const data = await TrasladosService.obtenerInventarioSede(
        Number(sedeId), 
        String(tipoTraslado), 
        especialidadId as string, 
        subespecialidadId as string, 
        tipoId as string
    );
    res.json({ data });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener el inventario de la sede" });
  }
};

export const ejecutarTraslado = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = ejecutarTrasladoSchema.parse(req.body);
    await TrasladosService.ejecutarTraslado(dataValidada);
    res.json({ msg: "Traslado ejecutado con éxito" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
        res.status(400).json({ msg: "Faltan datos para realizar el traslado." });
        return;
    }
    if (error.message === "MISMA_SEDE") {
        res.status(400).json({ msg: "La sede origen no puede ser la misma que la de destino." });
        return;
    }
    res.status(500).json({ msg: "Error al ejecutar el traslado" });
  }
};