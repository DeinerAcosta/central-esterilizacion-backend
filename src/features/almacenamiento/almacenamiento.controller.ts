import { Request, Response } from 'express';
import { z } from 'zod';
import { AlmacenamientoService } from './almacenamiento.service';
import { enviarSetSchema, movimientoInsumoSchema } from './almacenamiento.schema';

export const almacenamientoController = {

  // GET /instrumentos
  obtenerInstrumentos: async (req: Request, res: Response) => {
    try {
      const data = await AlmacenamientoService.obtenerInstrumentos();
      return res.json({ success: true, data });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en obtenerInstrumentos:', msg);
      return res.status(500).json({ success: false, message: 'Fallo al obtener instrumentos', error: msg });
    }
  },

  // GET /kits
  obtenerKits: async (req: Request, res: Response) => {
    try {
      const data = await AlmacenamientoService.obtenerKits();
      return res.json({ success: true, data });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en obtenerKits:', msg);
      return res.status(500).json({ success: false, message: 'Fallo al obtener kits', error: msg });
    }
  },

  // GET /insumos
  obtenerInsumos: async (req: Request, res: Response) => {
    try {
      const data = await AlmacenamientoService.obtenerInsumos();
      return res.json({ success: true, data });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en obtenerInsumos:', msg);
      return res.status(500).json({ success: false, message: 'Fallo al obtener insumos', error: msg });
    }
  },

  // GET /historial-prestamos
  getHistorialPrestamos: async (req: Request, res: Response) => {
    try {
      const data = await AlmacenamientoService.obtenerHistorialPrestamos();
      return res.json({ success: true, data });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en getHistorialPrestamos:', msg);
      return res.status(500).json({ success: false, message: 'Fallo al obtener historial', error: msg });
    }
  },

  // POST /enviar-set
  enviarSetQuirofano: async (req: Request, res: Response) => {
    try {
      const payload = enviarSetSchema.parse(req.body);
      const resultado = await AlmacenamientoService.enviarSetQuirofano(payload);
      return res.json({ success: true, data: { id: resultado.id }, message: 'Set enviado correctamente' });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.issues[0].message });
      }
      const msg = error instanceof Error ? error.message : 'Error al procesar el envío';
      console.error('Error en enviarSetQuirofano:', msg);
      return res.status(400).json({ success: false, message: msg });
    }
  },

  // POST /insumos/:tipo  (tipo = 'solicitud' | 'consumo')
  registrarMovimientoInsumo: async (req: Request, res: Response) => {
    try {
      const { tipo } = req.params;
      const payload = movimientoInsumoSchema.parse(req.body);
      await AlmacenamientoService.registrarMovimientoInsumo(tipo, payload);
      return res.json({ success: true, message: `Registro de ${tipo} guardado correctamente` });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.issues[0].message });
      }
      const msg = error instanceof Error ? error.message : 'Error al procesar la solicitud';
      console.error('Error en registrarMovimientoInsumo:', msg);
      return res.status(400).json({ success: false, message: msg });
    }
  },
};
