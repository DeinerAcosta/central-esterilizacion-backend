import { Request, Response } from 'express';
import { z } from 'zod';
import { HistorialTrasladosService } from './historialTraslados.service';
import { idParamSchema, trasladosQuerySchema } from './historialTraslados.schema';

export const historialTrasladosController = {
  listarKits: async (req: Request, res: Response): Promise<void> => {
    try {
      const params = trasladosQuerySchema.parse(req.query);
      const result = await HistorialTrasladosService.listarKits(params);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error listando traslados de kits:', error);
      res.status(500).json({ success: false, message: 'Error al listar traslados de kits' });
    }
  },

  listarInstrumentos: async (req: Request, res: Response): Promise<void> => {
    try {
      const params = trasladosQuerySchema.parse(req.query);
      const result = await HistorialTrasladosService.listarInstrumentos(params);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error listando traslados de instrumentos:', error);
      res.status(500).json({ success: false, message: 'Error al listar traslados de instrumentos' });
    }
  },

  obtenerContenidoKit: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const data = await HistorialTrasladosService.obtenerContenidoKit(id);
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      if (error instanceof Error && error.message === 'TRASLADO_KIT_NO_ENCONTRADO') {
        res.status(404).json({ success: false, message: 'Traslado de kit no encontrado' });
        return;
      }
      console.error('Error obteniendo contenido del kit:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  },
};
