import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class HistoricoCicloService {
  static async obtenerArbolJerarquico() {
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

    return arbol.filter(esp => esp.subespecialidades.length > 0);
  }

  static async obtenerHistoricoPorKit(kitId: number) {
    const instrumentos = await prisma.hojaVidaInstrumento.findMany({
      where: { kitId },
      include: {
        escaneosCiclo: true
      }
    });

    return instrumentos.map(inst => {
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
  }
}