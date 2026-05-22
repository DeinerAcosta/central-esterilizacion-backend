import { Request, Response } from 'express';
import { z } from 'zod';
import { TercerosService } from './terceros.service';
import {
  idParamSchema,
  ingresosQuerySchema,
  devolucionesQuerySchema,
  instrumentosDisponiblesQuerySchema,
  crearEntidadSchema,
  crearIngresoSchema,
  crearDevolucionSchema,
} from './terceros.schema';

/**
 * Parsea el cuerpo de la request. Soporta:
 *   - JSON puro
 *   - FormData con el cuerpo serializado en el campo "datos" (multipart)
 */
function parseBody(req: Request): unknown {
  if (req.body?.datos && typeof req.body.datos === 'string') {
    try {
      return JSON.parse(req.body.datos);
    } catch {
      return { __invalid: true };
    }
  }
  return req.body;
}

export const tercerosController = {
  // ─── ENTIDADES ──────────────────────────────────────────
  listarEntidades: async (_req: Request, res: Response): Promise<void> => {
    try {
      const data = await TercerosService.listarEntidades();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error listando entidades:', error);
      res.status(500).json({ success: false, message: 'Error al listar entidades' });
    }
  },

  crearEntidad: async (req: Request, res: Response): Promise<void> => {
    try {
      const data = crearEntidadSchema.parse(req.body);
      const entidad = await TercerosService.crearEntidad(data);
      res.status(201).json({ success: true, data: entidad });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error creando entidad:', error);
      res.status(500).json({ success: false, message: 'Error al crear entidad' });
    }
  },

  // ─── INGRESOS ───────────────────────────────────────────
  listarIngresos: async (req: Request, res: Response): Promise<void> => {
    try {
      const params = ingresosQuerySchema.parse(req.query);
      const result = await TercerosService.listarIngresos(params);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error listando ingresos:', error);
      res.status(500).json({ success: false, message: 'Error al listar ingresos' });
    }
  },

  obtenerIngreso: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const data = await TercerosService.obtenerIngreso(id);
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      if (error instanceof Error && error.message === 'INGRESO_NO_ENCONTRADO') {
        res.status(404).json({ success: false, message: 'Ingreso no encontrado' });
        return;
      }
      console.error('Error obteniendo ingreso:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  },

  crearIngreso: async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = parseBody(req);
      if (parsed && typeof parsed === 'object' && '__invalid' in parsed) {
        res.status(400).json({ success: false, message: 'El campo datos no es JSON válido' });
        return;
      }
      const data = crearIngresoSchema.parse(parsed);
      const evidenciaUrl = req.file ? `/uploads/evidencias/${req.file.filename}` : null;
      const ingreso = await TercerosService.crearIngreso(data, evidenciaUrl);
      res.status(201).json({ success: true, data: ingreso });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Zod error en crearIngreso:', error.issues);
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error creando ingreso:', error);
      res.status(500).json({ success: false, message: 'Error al crear ingreso' });
    }
  },

  // ─── DEVOLUCIONES ───────────────────────────────────────
  listarDevoluciones: async (req: Request, res: Response): Promise<void> => {
    try {
      const params = devolucionesQuerySchema.parse(req.query);
      const result = await TercerosService.listarDevoluciones(params);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error listando devoluciones:', error);
      res.status(500).json({ success: false, message: 'Error al listar devoluciones' });
    }
  },

  obtenerPendientesIngreso: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const data = await TercerosService.obtenerInstrumentosPendientes(id);
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      if (error instanceof Error && error.message === 'INGRESO_NO_ENCONTRADO') {
        res.status(404).json({ success: false, message: 'Ingreso no encontrado' });
        return;
      }
      console.error('Error obteniendo pendientes:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  },

  crearDevolucion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const parsed = parseBody(req);
      if (parsed && typeof parsed === 'object' && '__invalid' in parsed) {
        res.status(400).json({ success: false, message: 'El campo datos no es JSON válido' });
        return;
      }
      const data = crearDevolucionSchema.parse(parsed);
      const devolucion = await TercerosService.crearDevolucion(id, data);
      res.status(201).json({ success: true, data: devolucion });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      if (error instanceof Error) {
        if (error.message === 'INSTRUMENTO_FUERA_DE_INGRESO') {
          res.status(400).json({
            success: false,
            message: 'Algún instrumento no pertenece al ingreso seleccionado',
          });
          return;
        }
        if (error.message.startsWith('CANTIDAD_EXCEDE_PENDIENTE')) {
          res.status(400).json({
            success: false,
            message: 'La cantidad a devolver supera la cantidad pendiente',
          });
          return;
        }
      }
      console.error('Error creando devolución:', error);
      res.status(500).json({ success: false, message: 'Error al crear devolución' });
    }
  },

  obtenerDevolucion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const data = await TercerosService.obtenerDevolucion(id);
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      if (error instanceof Error && error.message === 'DEVOLUCION_NO_ENCONTRADA') {
        res.status(404).json({ success: false, message: 'Devolución no encontrada' });
        return;
      }
      console.error('Error obteniendo devolución:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  },

  // ─── INSTRUMENTOS DISPONIBLES ───────────────────────────
  listarInstrumentosDisponibles: async (req: Request, res: Response): Promise<void> => {
    try {
      const params = instrumentosDisponiblesQuerySchema.parse(req.query);
      const result = await TercerosService.listarInstrumentosDisponibles(params);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error listando instrumentos disponibles:', error);
      res.status(500).json({ success: false, message: 'Error al listar instrumentos' });
    }
  },
};
