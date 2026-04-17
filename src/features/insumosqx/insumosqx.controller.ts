import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const insumosQxController = {
  // 1. Obtener el catálogo para llenar el modal
  obtenerCatalogo: async (req: Request, res: Response) => {
    try {
      const insumos = await prisma.catalogoInsumo.findMany({
        where: { estado: 'Activo' }
      });
      return res.json({ success: true, data: insumos });
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
      
      // La foto llega por Multer
      const evidenciaUrl = req.file ? `/uploads/evidencias/${req.file.filename}` : null;

      if (!evidenciaUrl) {
        return res.status(400).json({ success: false, message: 'La foto del indicador es obligatoria.' });
      }

      // Validar el PIN del responsable
      const usuario = await prisma.usuario.findFirst({ where: { pin: pinResponsable } });
      if (!usuario) {
        return res.status(403).json({ success: false, message: 'PIN incorrecto o no autorizado.' });
      }

      const insumos = JSON.parse(insumosAgregados);

      // Transacción para guardar todo junto
      await prisma.$transaction(async (tx) => {
        // A. Guardar cada insumo con su cantidad
        for (const item of insumos) {
          await tx.insumoCiclo.create({
            data: {
              cicloId: Number(cicloId),
              insumoId: Number(item.id),
              cantidad: Number(item.cantidad)
            }
          });
        }

        // B. Actualizar el ciclo con la url de la foto del indicador
        await tx.cicloEsterilizacion.update({
          where: { id: Number(cicloId) },
          data: { 
            evidenciaInsumosUrl: evidenciaUrl 
          }
        });
      });

      return res.json({ success: true, message: 'Insumos Qx y evidencia registrados exitosamente.' });
    } catch (error) {
      console.error('Error al registrar insumos Qx:', error);
      return res.status(500).json({ success: false, message: 'Error al registrar el proceso.' });
    }
  }
};