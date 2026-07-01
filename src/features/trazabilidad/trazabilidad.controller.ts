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
        tab: (req.query.tab as string) || 'asignaciones',
        especialidadId:    req.query.especialidadId    as string,
        subespecialidadId: req.query.subespecialidadId as string,
        kitId:   req.query.kitId   as string,
        sedeId:  req.query.sedeId  as string,
        fechaDesde: req.query.fechaDesde as string,
        fechaHasta: req.query.fechaHasta as string,
      };

      const { total, ciclos } = await TrazabilidadService.obtenerTrazabilidad(params);
      return res.json({
        success: true,
        data: ciclos,
        total,
        totalPages: Math.ceil(total / params.limit),
        currentPage: params.page,
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
    } catch (error) {
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

      // ─── FIX: el frontend envía FormData con el JSON en el campo "datos"
      // req.body puede ser { datos: "[{id:1,estado:'aprobado',...}]" }
      // o JSON directo { instrumentos: [...] } — manejamos ambos casos
      let bodyParseado: unknown = req.body;

      if (req.body?.datos && typeof req.body.datos === 'string') {
        try {
          const parsed = JSON.parse(req.body.datos) as unknown;
          // El frontend envía el array directamente — lo envolvemos en { instrumentos }
          bodyParseado = Array.isArray(parsed)
            ? { instrumentos: parsed }
            : parsed;
        } catch {
          res.status(400).json({ success: false, message: 'El campo datos no es JSON válido' });
          return;
        }
      }

      const dataValidada = aprobarAsignacionSchema.parse(bodyParseado);

      // Mapear las evidencias adjuntas (campo "evidencia_<idInstrumento>") a su URL pública.
      const archivos = (req.files as Array<{ fieldname: string; filename: string }> | undefined) ?? [];
      const evidencias: Record<number, string> = {};
      for (const f of archivos) {
        const m = /^evidencia_(\d+)$/.exec(f.fieldname);
        if (m) evidencias[Number(m[1])] = `/uploads/${f.filename}`;
      }

      await TrazabilidadService.aprobarAsignacion(cicloId, dataValidada.instrumentos, evidencias);
      res.json({ success: true, message: 'Aprobación guardada correctamente' });

    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Zod error en aprobarAsignacion:', error.issues);
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      if (error instanceof Error && error.message === 'CICLO_NO_ENCONTRADO') {
        res.status(404).json({ success: false, message: 'Ciclo no encontrado' });
        return;
      }
      console.error('Error cargando detalles del ciclo:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  },
};