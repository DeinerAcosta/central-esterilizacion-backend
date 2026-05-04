import { Request, Response } from 'express';
import { z } from 'zod';
import { InsumosQxService } from './insumosqx.service';
import { registrarInsumosSchema } from './insumosqx.schema';

export const insumosQxController = {
  obtenerCatalogo: async (req: Request, res: Response) => {
    try {
      const data = await InsumosQxService.obtenerCatalogo();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
  },

  registrarInsumosCiclo: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;

      // 1. Verificar Imagen
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'La foto del indicador es obligatoria.' });
      }
      const evidenciaUrl = `/uploads/evidencias/${req.file.filename}`;

      // 2. Validar Data
      const dataValidada = registrarInsumosSchema.parse(req.body);

      // 3. Ejecutar Servicio (Aseguramos que cicloId se pase como String puro)
      await InsumosQxService.registrarInsumos(
        String(cicloId), 
        dataValidada.pinResponsable, 
        dataValidada.insumosAgregados, 
        evidenciaUrl
      );

      return res.json({ success: true, message: `Registro completado exitosamente.` });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.issues[0].message });
      }
      if (error.message === "PIN_INVALIDO") {
        return res.status(403).json({ success: false, message: 'PIN incorrecto o usuario no autorizado.' });
      }
      
      console.error('🚨 Error en registro:', error);
      return res.status(500).json({ success: false, message: 'Fallo en BD', error: error.message });
    }
  }
};