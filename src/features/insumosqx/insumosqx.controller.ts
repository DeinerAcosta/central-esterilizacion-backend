import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const insumosQxController = {
  
  /**
   * 1. OBTENER CATÁLOGO DE INSUMOS
   * Filtra solo los insumos activos que requieren esterilización según el documento.
   */
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
      console.error('🚨 Error al obtener catálogo de insumos Qx:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error interno al cargar el catálogo.',
        error: error.message 
      });
    }
  },

  /**
   * 2. REGISTRAR INSUMOS EN EL CICLO
   * Proceso blindado con transacciones: Borra previos, inserta nuevos y actualiza el ciclo.
   */
  registrarInsumosCiclo: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;
      const { pinResponsable, insumosAgregados } = req.body;
      const idCicloNum = Number(cicloId);

      // 🛡️ VALIDACIÓN 1: ID de Ciclo
      if (isNaN(idCicloNum) || idCicloNum <= 0) {
        return res.status(400).json({ success: false, message: 'El ID del ciclo es inválido.' });
      }

      // 🛡️ VALIDACIÓN 2: Existencia del Ciclo (Evita error de llave foránea 404)
      const cicloExiste = await prisma.cicloEsterilizacion.findUnique({ where: { id: idCicloNum } });
      if (!cicloExiste) {
        return res.status(404).json({ success: false, message: `No se encontró el ciclo con ID ${idCicloNum}.` });
      }

      // 📸 VALIDACIÓN 3: Archivo de Evidencia
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'La foto del indicador es obligatoria para finalizar.' });
      }
      const evidenciaUrl = `/uploads/evidencias/${req.file.filename}`;

      // 🔐 VALIDACIÓN 4: PIN del Responsable
      const usuario = await prisma.usuario.findFirst({ 
        where: { 
          codigoVerificacion: pinResponsable,
          estado: true 
        } 
      });

      if (!usuario) {
        return res.status(403).json({ success: false, message: 'PIN de responsable incorrecto o usuario inactivo.' });
      }

      // 🛡️ VALIDACIÓN 5: Formato de los Insumos
      let insumos = [];
      try {
        insumos = JSON.parse(insumosAgregados);
      } catch (parseError) {
        return res.status(400).json({ success: false, message: 'El formato de la lista de insumos es inválido.' });
      }

      if (!Array.isArray(insumos) || insumos.length === 0) {
        return res.status(400).json({ success: false, message: 'Debe agregar al menos un insumo al registro.' });
      }

      // 💾 TRANSACCIÓN SEGURA (Si algo falla, no se guarda nada)
      await prisma.$transaction(async (tx) => {
        
        // A. Limpiar registros previos para este ciclo (Idempotencia)
        await tx.insumoCiclo.deleteMany({
          where: { cicloId: idCicloNum }
        });

        // B. Insertar la nueva lista de insumos
        for (const item of insumos) {
          await tx.insumoCiclo.create({
            data: {
              cicloId: idCicloNum,
              insumoId: Number(item.id),
              cantidad: Number(item.cantidad)
            }
          });
        }

        // C. Actualizar el Ciclo con el Responsable y la URL de la evidencia
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
        message: `Registro completado exitosamente por ${usuario.nombre}.` 
      });

    } catch (error: any) {
      console.error('🚨 Error crítico en registrarInsumosCiclo:', error);
      
      // Captura de errores específicos de Prisma (Llaves foráneas, etc.)
      let errorDetalle = error.message;
      if (error.code === 'P2003') {
        errorDetalle = 'Uno de los insumos seleccionados ya no existe en el catálogo.';
      }

      return res.status(500).json({ 
        success: false, 
        message: 'Fallo en la base de datos',
        error: errorDetalle
      });
    }
  }
};