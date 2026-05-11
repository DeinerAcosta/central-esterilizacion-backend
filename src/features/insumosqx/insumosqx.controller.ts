import { Request, Response } from 'express';
import { z } from 'zod';
import { InsumosQxService } from './insumosqx.service';
import { registrarInsumosSchema } from './insumosqx.schema';

export const insumosQxController = {

  obtenerCatalogo: async (req: Request, res: Response) => {
    try {
      const data = await InsumosQxService.obtenerCatalogo();
      return res.json({ success: true, data });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      return res.status(500).json({ success: false, message: 'Error interno', error: msg });
    }
  },

  registrarInsumosCiclo: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;

      // 1. Verificar imagen
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'La foto del indicador es obligatoria.' });
      }
      const evidenciaUrl = `/uploads/evidencias/${req.file.filename}`;

      // 2. Validar datos con Zod (ahora incluye tipoSellado y valorIndicador)
      const dataValidada = registrarInsumosSchema.parse(req.body);

      // 3. Ejecutar servicio con todos los campos
      await InsumosQxService.registrarInsumos(
        String(cicloId),
        dataValidada.pinResponsable,
        dataValidada.insumosAgregados,
        evidenciaUrl,
        dataValidada.tipoSellado,
        dataValidada.valorIndicador,
        {
          destinoSet:            dataValidada.destinoSet,
          almacEstado:           dataValidada.almacEstado,
          almacFechaIngreso:     dataValidada.almacFechaIngreso,
          almacFechaVencimiento: dataValidada.almacFechaVencimiento,
          almacUbicacion:        dataValidada.almacUbicacion,
          almacObservacion:      dataValidada.almacObservacion,
        }
      );

      return res.json({ success: true, message: 'Registro completado exitosamente.' });

    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.issues[0].message });
      }
      if (error instanceof Error) {
        if (error.message === 'PIN_INVALIDO') {
          return res.status(403).json({ success: false, message: 'PIN incorrecto o usuario no autorizado.' });
        }
      }
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en registro de insumos QX:', msg);
      return res.status(500).json({ success: false, message: 'Fallo en BD', error: msg });
    }
  }
};