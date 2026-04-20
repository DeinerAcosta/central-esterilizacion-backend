import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const insumosQxController = {
  
  // 1. Obtener el catálogo REAL de la base de datos
  obtenerCatalogo: async (req: Request, res: Response) => {
    try {
      const insumos = await prisma.insumoQuirurgico.findMany({
        where: { 
          estado: true, 
          requiereEsterilizacion: true 
        },
        include: {
          unidadMedida: true,
          presentacion: true
        }
      });

      const datosMapeados = insumos.map(ins => ({
        id: ins.id,
        codigo: ins.codigo,
        nombre: ins.nombre,
        unidad: ins.unidadMedida?.nombre || 'N/A',
        esterilizacion: ins.tipoEsterilizacion || 'N/A',
        presentacion: ins.presentacion?.nombre || 'N/A'
      }));

      return res.json({ success: true, data: datosMapeados });
    } catch (error: any) {
      console.error('Error al obtener catálogo de insumos Qx:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
  },

  // 2. Guardar todo el proceso de insumos (Pin, Insumos y Foto)
  registrarInsumosCiclo: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;
      const { pinResponsable, insumosAgregados } = req.body;
      const idCicloNum = Number(cicloId);

      // 🛡️ VALIDACIÓN 1: ID Válido
      if (isNaN(idCicloNum) || idCicloNum <= 0) {
        return res.status(400).json({ success: false, message: 'El ID del ciclo es inválido.' });
      }

      // 🛡️ VALIDACIÓN 2: Existencia del Ciclo
      const cicloExiste = await prisma.cicloEsterilizacion.findUnique({ where: { id: idCicloNum } });
      if (!cicloExiste) {
        return res.status(404).json({ success: false, message: `No se encontró el ciclo con ID ${idCicloNum}.` });
      }

      // 📸 VALIDACIÓN 3: Foto Obligatoria
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'La foto del indicador es obligatoria.' });
      }
      const evidenciaUrl = `/uploads/evidencias/${req.file.filename}`;

      // 🔐 VALIDACIÓN 4: PIN de Seguridad
      const usuario = await prisma.usuario.findFirst({ 
        where: { 
          codigoVerificacion: pinResponsable,
          estado: true 
        } 
      });

      if (!usuario) {
        return res.status(403).json({ success: false, message: 'PIN incorrecto o usuario no autorizado.' });
      }

      // 🛡️ VALIDACIÓN 5: Formato de Insumos
      let insumos = [];
      try {
        insumos = JSON.parse(insumosAgregados);
      } catch (parseError) {
        return res.status(400).json({ success: false, message: 'El formato de los insumos es inválido.' });
      }

      // 💾 TRANSACCIÓN SEGURA (Todo o nada)
      await prisma.$transaction(async (tx) => {
        
        // A. Limpiar insumos previos (Idempotencia)
        await tx.insumoCiclo.deleteMany({
          where: { cicloId: idCicloNum }
        });

        // B. Guardar cada insumo con validación de ID numérico
        if (insumos.length > 0) {
          for (const item of insumos) {
            await tx.insumoCiclo.create({
              data: {
                cicloId: idCicloNum,
                insumoId: Number(item.id),
                cantidad: Number(item.cantidad)
              }
            });
          }
        }

        // C. Actualizar datos finales del Ciclo
        await tx.cicloEsterilizacion.update({
          where: { id: idCicloNum },
          data: { 
            evidenciaInsumosUrl: evidenciaUrl,
            responsableActualId: usuario.id
          }
        });
      });

      return res.json({ 
        success: true, 
        message: `Insumos registrados exitosamente por ${usuario.nombre}.` 
      });

    } catch (error: any) {
      console.error('🚨 Error en registro de insumos:', error);
      
      // Manejo detallado de errores de Prisma
      let mensajeError = 'Error desconocido en Base de Datos.';
      if (error.code === 'P2003') mensajeError = 'Error de integridad: Uno de los insumos seleccionados no existe.';
      if (error.meta?.cause) mensajeError = error.meta.cause;

      return res.status(500).json({ 
        success: false, 
        message: `Fallo en BD: ${mensajeError}`
      });
    }
  }
};