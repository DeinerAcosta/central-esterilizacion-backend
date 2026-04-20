import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const insumosQxController = {
  
  // 1. Obtener el catálogo REAL de la base de datos
  obtenerCatalogo: async (req: Request, res: Response) => {
    try {
      // Buscamos en la tabla original InsumoQuirurgico y aplicamos el filtro del documento
      const insumos = await prisma.insumoQuirurgico.findMany({
        where: { 
          estado: true, 
          requiereEsterilizacion: true // <-- ✅ REGLA DEL DOCUMENTO APLICADA AQUÍ
        },
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
      
      // 🛡️ Validación estricta del ID del ciclo
      const idCicloNum = Number(cicloId);
      if (isNaN(idCicloNum) || idCicloNum <= 0) {
        return res.status(400).json({ success: false, message: 'El ID del ciclo proporcionado es inválido.' });
      }

      const evidenciaUrl = req.file ? `/uploads/evidencias/${req.file.filename}` : null;

      if (!evidenciaUrl) {
        return res.status(400).json({ success: false, message: 'La foto del indicador es obligatoria.' });
      }

      // 🔐 1. VALIDACIÓN REAL EN BASE DE DATOS DEL PIN
      const usuario = await prisma.usuario.findFirst({ 
        where: { 
          codigoVerificacion: pinResponsable,
          estado: true // Validamos que el usuario siga activo
        } 
      });

      if (!usuario) {
        return res.status(403).json({ success: false, message: 'PIN incorrecto o usuario no autorizado.' });
      }

      // 🛡️ Parseo seguro del JSON
      let insumos = [];
      try {
        insumos = JSON.parse(insumosAgregados);
      } catch (parseError) {
        return res.status(400).json({ success: false, message: 'El formato de los insumos enviados es inválido.' });
      }

      // 💾 2. TRANSACCIÓN SEGURA
      await prisma.$transaction(async (tx) => {
        // A. Guardar cada insumo en el ciclo
        for (const item of insumos) {
          await tx.insumoCiclo.create({
            data: {
              cicloId: idCicloNum,
              insumoId: Number(item.id),
              cantidad: Number(item.cantidad)
            }
          });
        }

        // B. Actualizar el ciclo con la foto Y EL RESPONSABLE QUE FIRMÓ
        await tx.cicloEsterilizacion.update({
          where: { id: idCicloNum },
          data: { 
            evidenciaInsumosUrl: evidenciaUrl,
            responsableActualId: usuario.id // 🚀 AQUÍ QUEDA REGISTRADO QUIÉN AUTORIZÓ
          }
        });
      });

      return res.json({ 
        success: true, 
        message: `Insumos registrados exitosamente por ${usuario.nombre}.` 
      });

    } catch (error: any) {
      // 🚨 CAPTURA DEL ERROR REAL DE PRISMA
      console.error('🚨 Error CRÍTICO en la Base de Datos al registrar insumos Qx:', error);
      
      // Extraemos la causa exacta del error de Prisma (si existe) para enviarla al Frontend
      const mensajeErrorExacto = error.meta?.cause || error.message || 'Error desconocido al guardar en Base de Datos.';

      return res.status(500).json({ 
        success: false, 
        message: `Fallo en BD: ${mensajeErrorExacto}` // Ahora SweetAlert te mostrará el error real
      });
    }
  }
};