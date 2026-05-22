import { Request, Response } from 'express';
import { z } from 'zod';
import { SolicitudesInstrumentoService } from './solicitudesInstrumento.service';
import {
  idParamSchema,
  listarQuerySchema,
  crearSolicitudSchema,
} from './solicitudesInstrumento.schema';

export const solicitudesInstrumentoController = {
  listar: async (req: Request, res: Response): Promise<void> => {
    try {
      const params = listarQuerySchema.parse(req.query);
      const result = await SolicitudesInstrumentoService.listar(params);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error listando solicitudes:', error);
      res.status(500).json({ success: false, message: 'Error al listar solicitudes' });
    }
  },

  obtener: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const data = await SolicitudesInstrumentoService.obtener(id);
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      if (error instanceof Error && error.message === 'SOLICITUD_NO_ENCONTRADA') {
        res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        return;
      }
      console.error('Error obteniendo solicitud:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  },

  crear: async (req: Request, res: Response): Promise<void> => {
    try {
      const data = crearSolicitudSchema.parse(req.body);
      const fotoUrl = req.file ? `/uploads/solicitudes/${req.file.filename}` : null;
      const solicitud = await SolicitudesInstrumentoService.crear(data, fotoUrl);
      res.status(201).json({ success: true, data: solicitud });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error creando solicitud:', error);
      res.status(500).json({ success: false, message: 'Error al crear solicitud' });
    }
  },
};
