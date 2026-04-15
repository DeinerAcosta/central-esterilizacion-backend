import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const historicoCicloController = {
  getArbolJerarquico: async (req: Request, res: Response) => {
    try {
      const especialidades = await prisma.especialidad.findMany({
        where: { estado: true },
        include: {
          subespecialidades: {
            where: { estado: true },
            include: {
              kits: {
                where: { estado: "Habilitado" },
                select: { id: true, nombre: true, codigoKit: true, tipoSubespecialidad: true }
              }
            }
          }
        }
      });
      const arbol = especialidades.map(esp => {
        return {
          id: esp.id,
          nombre: esp.nombre,
          subespecialidades: esp.subespecialidades.map(sub => {
            const tiposMap: Record<string, any> = {};           
            sub.kits.forEach(kit => {
              const nombreTipo = kit.tipoSubespecialidad || 'General';
              if (!tiposMap[nombreTipo]) {
                tiposMap[nombreTipo] = {
                  id: nombreTipo,
                  nombre: nombreTipo,
                  kits: []
                };
              }
              tiposMap[nombreTipo].kits.push({
                id: kit.id,
                nombre: kit.nombre,
                codigoKit: kit.codigoKit
              });
            });
            return {
              id: sub.id,
              nombre: sub.nombre,
              tipos: Object.values(tiposMap)
            };
          })
        };
      });
      const arbolLimpio = arbol.filter(esp => esp.subespecialidades.length > 0);
      res.json({ success: true, data: arbolLimpio });
    } catch (error) {
      console.error("❌ Error obteniendo el árbol jerárquico:", error);
      res.status(500).json({ success: false, msg: "Error al obtener la jerarquía de inventario." });
    }
  },
  getHistoricoPorKit: async (req: Request, res: Response) => {
    try {
      const { kitId } = req.params;

      if (!kitId) {
        return res.status(400).json({ success: false, msg: "ID del kit es requerido." });
      }
      const instrumentos = await prisma.hojaVidaInstrumento.findMany({
        where: { kitId: Number(kitId) },
        include: {
          escaneosCiclo: true
        }
      });
      const datosHistorico = instrumentos.map(inst => {
        const lavado = inst.escaneosCiclo.filter(e => e.etapa === 1).length;
        const secado = inst.escaneosCiclo.filter(e => e.etapa === 2).length;
        const sellado = inst.escaneosCiclo.filter(e => e.etapa === 3).length;
        const rotulado = inst.escaneosCiclo.filter(e => e.etapa === 4).length;
        const esterilizado = inst.escaneosCiclo.filter(e => e.etapa === 5).length;
        const cirugia = inst.cicloEsterilizacion || 0; 
        let estadoBadge = "Habilitado";
        const estadoDb = (inst.estadoActual || "").toLowerCase();
        
        if (estadoDb.includes("baja")) {
          estadoBadge = "Baja";
        } else if (estadoDb.includes("mantenimiento")) {
          estadoBadge = "Mantenimiento";
        } else if (estadoDb.includes("deshabilitado")) {
          estadoBadge = "Deshabilitado";
        }

        return {
          id: inst.id,
          nombre: inst.nombre,
          lavado,
          secado,
          sellado,
          rotulado,
          esterilizado,
          cirugia,
          estado: estadoBadge
        };
      });
      res.json({ success: true, data: datosHistorico });
    } catch (error) {
      console.error("❌ Error obteniendo el histórico del kit:", error);
      res.status(500).json({ success: false, msg: "Error al obtener el histórico de instrumentos." });
    }
  }
};