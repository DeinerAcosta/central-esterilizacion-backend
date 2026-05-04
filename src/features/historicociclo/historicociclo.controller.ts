import { Request, Response } from 'express';
import { z } from 'zod';
import { HistoricoCicloService } from './historicociclo.service';
import { getHistoricoPorKitSchema } from './historicociclo.schema';

export const historicoCicloController = {
  getArbolJerarquico: async (req: Request, res: Response): Promise<void> => {
    try {
      const arbolLimpio = await HistoricoCicloService.obtenerArbolJerarquico();
      res.json({ success: true, data: arbolLimpio });
    } catch (error) {
      console.error("❌ Error obteniendo el árbol jerárquico:", error);
      res.status(500).json({ success: false, msg: "Error al obtener la jerarquía de inventario." });
    }
  },

  getHistoricoPorKit: async (req: Request, res: Response): Promise<void> => {
    try {
      // Validamos el parámetro de la URL
      const dataValidada = getHistoricoPorKitSchema.parse(req.params);
      
      const datosHistorico = await HistoricoCicloService.obtenerHistoricoPorKit(dataValidada.kitId);
      res.json({ success: true, data: datosHistorico });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, msg: error.issues[0].message });
        return;
      }
      console.error("❌ Error obteniendo el histórico del kit:", error);
      res.status(500).json({ success: false, msg: "Error al obtener el histórico de instrumentos." });
    }
  }
};