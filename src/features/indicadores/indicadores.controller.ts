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

export const indicadoresController = {
  listarBiologico: listarPorTipo('biologico'),
  listarGas: listarPorTipo('gas'),
  listarPaquetes: listarSimple((p) => IndicadoresService.listarPaquetes(p), 'paquetes'),
  listarPrimeraCarga: listarSimple((p) => IndicadoresService.listarPrimeraCarga(p), 'primera-carga'),
};
