import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const almacenamientoController = {
  
  // 1. Obtener Insumos (Los que salieron de los ciclos)
  obtenerInsumos: async (req: Request, res: Response) => {
    try {
      // Buscamos todos los insumos que se han usado en los ciclos
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
        // Usamos la fecha de actualización del ciclo como fecha de consumo
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

  // 2. Obtener Instrumentos Individuales
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

  // 3. Obtener Kits (Con su fecha de vencimiento basada en el último ciclo)
  obtenerKits: async (req: Request, res: Response) => {
    try {
      const kits = await prisma.kit.findMany({
        include: {
          especialidad: true,
          subespecialidad: true,
          // Traemos el último ciclo por el que pasó este kit para ver su vencimiento
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
          // Si el ciclo tiene fecha de vencimiento en almacén, la mostramos
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