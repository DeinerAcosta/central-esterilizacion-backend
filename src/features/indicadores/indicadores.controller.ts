import { Request, Response } from 'express';
import { z } from 'zod';
import { IndicadoresService, type TipoIndicador } from './indicadores.service';
import { indicadoresQuerySchema } from './indicadores.schema';

const listarPorTipo = (tipo: TipoIndicador) => async (req: Request, res: Response): Promise<void> => {
  try {
    const params = indicadoresQuerySchema.parse(req.query);
    const result = await IndicadoresService.listar(tipo, params);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.issues[0].message });
      return;
    }
    console.error(`Error listando indicador ${tipo}:`, error);
    res.status(500).json({ success: false, message: 'Error al listar el indicador' });
  }
};

const listarSimple = (
  fn: (params: ReturnType<typeof indicadoresQuerySchema.parse>) => Promise<unknown>,
  recurso: string,
) => async (req: Request, res: Response): Promise<void> => {
  try {
    const params = indicadoresQuerySchema.parse(req.query);
    const result = await fn(params);
    res.json({ success: true, ...(result as object) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.issues[0].message });
      return;
    }
    console.error(`Error listando ${recurso}:`, error);
    res.status(500).json({ success: false, message: 'Error al listar el indicador' });
  }
};

const obtenerDetalle = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'ID inválido' });
      return;
    }
    const data = await IndicadoresService.obtenerDetalle(id);
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === 'INDICADOR_NO_ENCONTRADO') {
      res.status(404).json({ success: false, message: 'Indicador no encontrado' });
      return;
    }
    console.error('Error obteniendo detalle de indicador:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el detalle' });
  }
};

// Crear registro de Indicador de Primera Carga (con 3 archivos de evidencia).
const crearPrimeraCarga = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as { [k: string]: Express.Multer.File[] } | undefined;
    const urlOf = (k: string) => files?.[k]?.[0] ? `/uploads/indicadores/${files[k][0].filename}` : undefined;

    const bodySchema = z.object({
      codigoVerificacion: z.string().min(1, 'PIN requerido'),
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
      lote: z.string().min(1, 'Lote requerido'),
      equipo: z.string().min(1, 'Equipo requerido'),
      instrumental: z.string().min(1, 'Instrumental requerido'),
      temperatura: z.string().min(1, 'Temperatura requerida'),
      librasPresion: z.string().min(1, 'Libras presión requerido'),
      horaInicio: z.string().min(1, 'Hora inicio requerida'),
      horaSalida: z.string().min(1, 'Hora salida requerida'),
    });
    const data = bodySchema.parse(req.body);

    const registro = await IndicadoresService.crearPrimeraCarga(data, {
      integradorFisico: urlOf('integradorFisico'),
      indicadorBiologico: urlOf('indicadorBiologico'),
      indicadorQuimico: urlOf('indicadorQuimico'),
    });
    res.json({ success: true, data: registro });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.issues[0].message });
      return;
    }
    if (error instanceof Error && error.message === 'PIN_INVALIDO') {
      res.status(401).json({ success: false, message: 'PIN incorrecto o usuario inactivo' });
      return;
    }
    console.error('Error creando registro de primera carga:', error);
    res.status(500).json({ success: false, message: 'Error al crear el registro' });
  }
};

export const indicadoresController = {
  listarBiologico: listarPorTipo('biologico'),
  listarGas: listarPorTipo('gas'),
  listarPaquetes: listarSimple((p) => IndicadoresService.listarPaquetes(p), 'paquetes'),
  listarPrimeraCarga: listarSimple((p) => IndicadoresService.listarPrimeraCarga(p), 'primera-carga'),
  crearPrimeraCarga,
  obtenerDetalle,
};
