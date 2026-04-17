import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const insumosQxController = {
  
  // 1. Obtener el catálogo REAL de la base de datos
  obtenerCatalogo: async (req: Request, res: Response) => {
    try {
      // Buscamos en la tabla original InsumoQuirurgico y traemos sus relaciones
      const insumos = await prisma.insumoQuirurgico.findMany({
        where: { estado: true }, // Tu tabla original usa un booleano para el estado
        include: {
          unidadMedida: true,
          presentacion: true
        }
      });

      // Mapeamos los datos para que el frontend los reciba exactamente con los nombres que espera
      const datosMapeados = insumos.map(ins => ({
        id: ins.id,
        codigo: ins.codigo,
        nombre: ins.nombre,
        unidad: ins.unidadMedida?.nombre || 'N/A',
        esterilizacion: ins.tipoEsterilizacion || 'N/A',
        presentacion: ins.presentacion?.nombre || 'N/A'
      }));

      return res.json({ success: true, data: datosMapeados });
    } catch (error) {
      console.error('Error al obtener catálogo de insumos Qx:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  // 2. Guardar todo el proceso de insumos (Pin, Insumos y Foto)
  registrarInsumosCiclo: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;
      const { pinResponsable, insumosAgregados } = req.body;
      
      const evidenciaUrl = req.file ? `/uploads/evidencias/${req.file.filename}` : null;

      if (!evidenciaUrl) {
        return res.status(400).json({ success: false, message: 'La foto del indicador es obligatoria.' });
      }

      // Validar el PIN
      const usuario = await prisma.usuario.findFirst({ where: { codigoVerificacion: pinResponsable } });
      if (!usuario) {
        return res.status(403).json({ success: false, message: 'PIN incorrecto o no autorizado.' });
      }

      const insumos = JSON.parse(insumosAgregados);

      // Transacción
      await prisma.$transaction(async (tx) => {
        // A. Guardar cada insumo en el ciclo
        for (const item of insumos) {
          await tx.insumoCiclo.create({
            data: {
              cicloId: Number(cicloId),
              insumoId: Number(item.id),
              cantidad: Number(item.cantidad)
            }
          });
        }

        // B. Guardar la foto en el ciclo
        await tx.cicloEsterilizacion.update({
          where: { id: Number(cicloId) },
          data: { evidenciaInsumosUrl: evidenciaUrl }
        });
      });

      return res.json({ success: true, message: 'Insumos Qx y evidencia registrados exitosamente.' });
    } catch (error) {
      console.error('Error al registrar insumos Qx:', error);
      return res.status(500).json({ success: false, message: 'Error al registrar el proceso.' });
    }
  }
};