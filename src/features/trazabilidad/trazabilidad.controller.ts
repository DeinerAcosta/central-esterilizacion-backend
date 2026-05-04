import { Request, Response } from 'express';
import { z } from 'zod';
import { TrazabilidadService } from './trazabilidad.service';
import { cicloIdSchema, aprobarAsignacionSchema } from './trazabilidad.schema';

export const trazabilidadController = {
  getTrazabilidad: async (req: Request, res: Response) => {
    try {
      const params = {
        page: parseInt(req.query.page as string) || 1,
        limit: 10,
        tab: req.query.tab as string || 'asignaciones',
        especialidadId: req.query.especialidadId as string,
        subespecialidadId: req.query.subespecialidadId as string,
        kitId: req.query.kitId as string,
        sedeId: req.query.sedeId as string,
        fechaDesde: req.query.fechaDesde as string,
        fechaHasta: req.query.fechaHasta as string
      };

      const { total, ciclos } = await TrazabilidadService.obtenerTrazabilidad(params);

      return res.json({
        success: true,
        data: ciclos,
        total,
        totalPages: Math.ceil(total / params.limit),
        currentPage: params.page
      });

    } catch (error) {
      console.error('Error obteniendo trazabilidad:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  getInstrumentosAsignacion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { cicloId } = cicloIdSchema.parse(req.params);
      const data = await TrazabilidadService.obtenerInstrumentosAsignacion(cicloId);
      res.json({ success: true, data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      console.error('Error obteniendo instrumentos:', error);
      res.status(500).json({ success: false, message: 'Error al cargar instrumentos' });
    }
  },

  aprobarAsignacion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { cicloId } = cicloIdSchema.parse(req.params);
      const dataValidada = aprobarAsignacionSchema.parse(req.body);

      await TrazabilidadService.aprobarAsignacion(cicloId, dataValidada.instrumentos);
      res.json({ success: true, message: 'Aprobación guardada correctamente' });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Formato de instrumentos inválido' });
        return;
      }
      console.error('Error aprobando asignación:', error);
      res.status(500).json({ success: false, message: 'Error al procesar la aprobación' });
    }
  },

  getDetallesCiclo: async (req: Request, res: Response): Promise<void> => {
    try {
      const { cicloId } = cicloIdSchema.parse(req.params);
      const data = await TrazabilidadService.obtenerDetallesCiclo(cicloId);
      
      res.json({ success: true, data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      if (error.message === "CICLO_NO_ENCONTRADO") {
        res.status(404).json({ success: false, message: 'Ciclo no encontrado' });
        return;
      }
      console.error('Error cargando detalles del ciclo:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
};