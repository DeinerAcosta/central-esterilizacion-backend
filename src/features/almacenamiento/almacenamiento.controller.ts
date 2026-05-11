import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const almacenamientoController = {
  obtenerInsumos: async (req: Request, res: Response) => {
    try {

      const insumosCiclo = await prisma.insumoCiclo.findMany({
        include: {
          insumo: true,
          ciclo: true
        },
        orderBy: { id: 'desc' }
      });

      const data = insumosCiclo.map(ic => ({
        id: ic.id,
        codigo: ic.insumo.codigo,
        fecha: ic.ciclo.updatedAt.toISOString().split('T')[0].split('-').reverse().join('/'), 
        tipo: 'Consumido', // Por defecto, si están en un ciclo, fueron consumidos
        nombre: ic.insumo.nombre,
        esterilizado: ic.insumo.tipoEsterilizacion || 'No aplica',
        cantidad: ic.cantidad
      }));

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error en obtenerInsumos:', error);
      return res.status(500).json({ success: false, message: 'Fallo en BD', error: error.message });
    }
  },

  obtenerInstrumentos: async (req: Request, res: Response) => {
    try {
      const instrumentos = await prisma.hojaVidaInstrumento.findMany({
        include: {
          especialidad: true,
          subespecialidad: true,
          tipo: true,
          kit: true
        },
        orderBy: { id: 'desc' }
      });

      const data = instrumentos.map(inst => ({
        id: inst.id,
        vencimiento: inst.proximoMantenimiento 
            ? inst.proximoMantenimiento.toISOString().split('T')[0].split('-').reverse().join('/') 
            : 'Sin registrar',
        nombre: inst.nombre,
        kit: inst.kit ? inst.kit.codigoKit : 'Individual',
        especialidad: inst.especialidad?.nombre || 'N/A',
        sub: inst.subespecialidad?.nombre || 'N/A',
        tSub: inst.tipo?.nombre || 'N/A'
      }));

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error en obtenerInstrumentos:', error);
      return res.status(500).json({ success: false, message: 'Fallo en BD', error: error.message });
    }
  },

  obtenerKits: async (req: Request, res: Response) => {
    try {
      const kits = await prisma.kit.findMany({
        include: {
          especialidad: true,
          subespecialidad: true,
          ciclos: {
            orderBy: { id: 'desc' },
            take: 1
          }
        },
        orderBy: { id: 'desc' }
      });

      const data = kits.map(k => {
        const ultimoCiclo = k.ciclos[0];
        return {
          id: k.id,
          vencimiento: ultimoCiclo?.almacFechaVencimiento || 'Sin ciclo previo',
          kit: k.codigoKit,
          especialidad: k.especialidad?.nombre || 'N/A',
          sub: k.subespecialidad?.nombre || 'N/A',
          tSub: k.tipoSubespecialidad || 'N/A'
        };
      });

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error en obtenerKits:', error);
      return res.status(500).json({ success: false, message: 'Fallo en BD', error: error.message });
    }
  }
};