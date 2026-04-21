import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const insumosQxController = {
  
  obtenerCatalogo: async (req: Request, res: Response) => {
    try {
      const insumos = await prisma.insumoQuirurgico.findMany({
        where: { estado: true, requiereEsterilizacion: true },
        include: { unidadMedida: true, presentacion: true }
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
      return res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    }
  },

  registrarInsumosCiclo: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;
      const { pinResponsable, insumosAgregados } = req.body;
      let idCicloNum = Number(cicloId);

      // 📸 VALIDACIÓN 1: Archivo
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'La foto del indicador es obligatoria.' });
      }
      const evidenciaUrl = `/uploads/evidencias/${req.file.filename}`;

      // 🔐 VALIDACIÓN 2: PIN
      const usuario = await prisma.usuario.findFirst({ 
        where: { codigoVerificacion: pinResponsable, estado: true } 
      });

      if (!usuario) {
        return res.status(403).json({ success: false, message: 'PIN incorrecto o usuario no autorizado.' });
      }

      // 🛡️ VALIDACIÓN 3: Formato
      let insumos = [];
      try {
        insumos = JSON.parse(insumosAgregados);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Formato inválido.' });
      }

      if (insumos.length === 0) {
        return res.status(400).json({ success: false, message: 'Agregue al menos un insumo.' });
      }

      // 💾 TRANSACCIÓN SEGURA
      await prisma.$transaction(async (tx) => {
        
        // 🚀 LA MAGIA: Si el ID es 0 o no existe, CREAMOS un ciclo nuevo solo para insumos
        if (isNaN(idCicloNum) || idCicloNum <= 0) {
          const nuevoCiclo = await tx.cicloEsterilizacion.create({
            data: {
              codigoCiclo: `C-INS-${Date.now().toString().slice(-6)}`, // Código autogenerado
              estadoGlobal: "Finalizado",
              etapaActual: 5,
              responsableActualId: usuario.id,
              evidenciaInsumosUrl: evidenciaUrl
            }
          });
          idCicloNum = nuevoCiclo.id; // Asignamos el ID nuevo para usarlo abajo
        } 
        else {
          // Si sí mandaron un ID válido por la URL, usamos ese y actualizamos
          await tx.cicloEsterilizacion.update({
            where: { id: idCicloNum },
            data: { 
              evidenciaInsumosUrl: evidenciaUrl,
              responsableActualId: usuario.id
            }
          });
          // Limpiamos previos por si están corrigiendo algo
          await tx.insumoCiclo.deleteMany({ where: { cicloId: idCicloNum } });
        }

        // Guardamos todos los insumos amarrados al ciclo (ya sea el nuevo o el viejo)
        for (const item of insumos) {
          await tx.insumoCiclo.create({
            data: {
              cicloId: idCicloNum,
              insumoId: Number(item.id),
              cantidad: Number(item.cantidad)
            }
          });
        }
      });

      return res.json({ success: true, message: `Registro completado exitosamente.` });

    } catch (error: any) {
      console.error('🚨 Error en registro:', error);
      return res.status(500).json({ success: false, message: 'Fallo en BD', error: error.message });
    }
  }
};