import { Request, Response } from 'express';
import { z } from 'zod';
import { CiclosService } from './ciclos.service';
import { 
  kitIdParamSchema, 
  cicloIdParamSchema, 
  avanzarEtapaSchema, 
  escanearInstrumentoSchema, 
  finalizarCicloSchema 
} from './ciclos.schema';

export const ciclosController = {
  obtenerCicloActivo: async (req: Request, res: Response): Promise<void> => {
    try {
      const { kitId } = kitIdParamSchema.parse(req.params);
      const ciclo = await CiclosService.obtenerCicloActivo(kitId);

      if (!ciclo) {
        res.status(404).json({ success: false, message: 'No hay ciclo activo para este KIT' });
        return;
      }
      res.json({ success: true, ciclo });
    } catch (error) {
      console.error('Error al obtener ciclo activo:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  avanzarEtapa: async (req: Request, res: Response): Promise<void> => {
    try {
      const dataValidada = avanzarEtapaSchema.parse(req.body);
      const ciclo = await CiclosService.avanzarEtapa(dataValidada);
      res.json({ success: true, ciclo });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Datos inválidos para avanzar de etapa' });
        return;
      }
      console.error('Error al avanzar etapa:', error);
      res.status(500).json({ success: false, message: 'Error al avanzar de etapa' });
    }
  },

  escanearInstrumento: async (req: Request, res: Response): Promise<void> => {
    try {
      const dataValidada = escanearInstrumentoSchema.parse(req.body);
      const resultado = await CiclosService.escanearInstrumento(dataValidada);

      res.json({ 
        success: true, 
        escaneo: resultado.escaneo, 
        ciclo: resultado.cicloActivo, 
        kit: resultado.kit 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues[0].message });
        return;
      }
      if (error.message === "INSTRUMENTO_NO_ENCONTRADO") {
        res.status(404).json({ success: false, message: 'Instrumento no encontrado en la Base de Datos' });
        return;
      }
      if (error.message === "SIN_KIT") {
        res.status(400).json({ success: false, message: 'El instrumento no pertenece a ningún KIT' });
        return;
      }
      if (error.message === "FALTA_FIRMA") {
        res.status(400).json({ success: false, message: 'Falta la firma electrónica (PIN) para iniciar' });
        return;
      }
      if (error.message === "CICLO_NO_ENCONTRADO") {
        res.status(404).json({ success: false, message: 'Ciclo no encontrado' });
        return;
      }
      console.error('Error al escanear instrumento:', error);
      res.status(500).json({ success: false, message: 'Error interno al registrar el escaneo' });
    }
  },

  finalizarCiclo: async (req: Request, res: Response): Promise<void> => {
    try {
      const { cicloId } = cicloIdParamSchema.parse(req.params);
      const dataValidada = finalizarCicloSchema.parse(req.body);
      
      const indicadorUrl = req.file ? `/uploads/evidencias/${req.file.filename}` : null;
      
      const cicloFinalizado = await CiclosService.finalizarCiclo(cicloId, dataValidada, indicadorUrl);

      res.json({ 
        success: true, 
        ciclo: cicloFinalizado, 
        message: 'El ciclo de esterilización ha sido completado.',
        alertaSecundaria: 'Resultado de esterilización registrado correctamente.'
      });
    } catch (error) {
      console.error('Error al finalizar el ciclo:', error);
      res.status(500).json({ success: false, message: 'Error interno al finalizar el ciclo' });
    }
  },

  obtenerConteoEtapas: async (req: Request, res: Response): Promise<void> => {
    try {
      const conteos = await CiclosService.obtenerConteoEtapas();
      res.json({ success: true, conteos });
    } catch (error) {
      console.error('Error al obtener conteo de etapas:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor al contar etapas' });
    }
  },

  obtenerHistoricoKit: async (req: Request, res: Response): Promise<void> => {
    try {
      const { kitId } = kitIdParamSchema.parse(req.params);
      const dataFormateada = await CiclosService.obtenerHistoricoKit(kitId);
      res.json(dataFormateada);
    } catch (error) {
      console.error('Error al obtener el historial del kit:', error);
      res.status(500).json({ success: false, message: 'Error interno al buscar historial' });
    }
  },

  getTableroControl: async (req: Request, res: Response): Promise<void> => {
    try {
      const ciclosActivos = await CiclosService.obtenerTableroControl();
      res.json({ success: true, data: ciclosActivos });
    } catch (error) {
      console.error("❌ Error al obtener el tablero:", error);
      res.status(500).json({ success: false, message: "Error al cargar el tablero de control." });
    }
  },

  eliminarCiclo: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
      await CiclosService.eliminarCiclo(id);
      res.json({ success: true, message: 'Ciclo eliminado correctamente de la BD' });
    } catch (error) {
      console.error('Error eliminando ciclo:', error);
      res.status(500).json({ success: false, message: 'Error en el servidor al eliminar el ciclo' });
    }
  }
};