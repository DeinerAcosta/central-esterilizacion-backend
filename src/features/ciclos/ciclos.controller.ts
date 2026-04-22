import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const ciclosController = {
  obtenerCicloActivo: async (req: Request, res: Response) => {
    try {
      const { kitId } = req.params;
      const ciclo = await prisma.cicloEsterilizacion.findFirst({
        where: { 
          kitId: Number(kitId), 
          estadoGlobal: 'En Curso' 
        },
        include: {
          escaneos: { include: { instrumento: true } },
          responsable: true,
          kit: { include: { especialidad: true, subespecialidad: true } }
        }
      });

      if (!ciclo) {
        return res.status(404).json({ success: false, message: 'No hay ciclo activo para este KIT' });
      }

      return res.json({ success: true, ciclo });
    } catch (error) {
      console.error('Error al obtener ciclo activo:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  avanzarEtapa: async (req: Request, res: Response) => {
    try {
      const { cicloId, responsableId, nuevaEtapa, tipoSellado } = req.body;

      if (!cicloId) {
        return res.status(400).json({ success: false, message: 'No hay ciclo activo para avanzar' });
      }

      const ciclo = await prisma.cicloEsterilizacion.update({
        where: { id: Number(cicloId) },
        data: { 
          etapaActual: Number(nuevaEtapa), 
          responsableActualId: Number(responsableId),
          ...(tipoSellado && { tipoSellado }) 
        }
      });

      return res.json({ success: true, ciclo });
    } catch (error) {
      console.error('Error al avanzar etapa:', error);
      return res.status(500).json({ success: false, message: 'Error al avanzar de etapa' });
    }
  },

  escanearInstrumento: async (req: Request, res: Response) => {
    try {
      const { cicloId, codigoInstrumento, etapa, estadoFisico, responsableId } = req.body;
      const instrumento = await prisma.hojaVidaInstrumento.findUnique({
        where: { codigo: codigoInstrumento },
        include: { kit: { include: { especialidad: true, subespecialidad: true } } }
      });

      if (!instrumento) {
        return res.status(404).json({ success: false, message: 'Instrumento no encontrado en la Base de Datos' });
      }
      if (!instrumento.kitId) {
        return res.status(400).json({ success: false, message: 'El instrumento no pertenece a ningún KIT' });
      }

      let cicloActivo = null;

      if (!cicloId) {
        cicloActivo = await prisma.cicloEsterilizacion.findFirst({
          where: { kitId: instrumento.kitId, estadoGlobal: 'En Curso' }
        });
        if (!cicloActivo) {
          if (!responsableId) {
            return res.status(400).json({ success: false, message: 'Falta la firma electrónica (PIN) para iniciar' });
          }
          
          cicloActivo = await prisma.cicloEsterilizacion.create({
            data: {
              kitId: instrumento.kitId,
              etapaActual: 0,
              responsableActualId: Number(responsableId),
              codigoCiclo: `C-QX-${Date.now()}`
            }
          });
        }
      } else {
        cicloActivo = await prisma.cicloEsterilizacion.findUnique({ 
          where: { id: Number(cicloId) } 
        });
        
        if (!cicloActivo) {
          return res.status(404).json({ success: false, message: 'Ciclo no encontrado' });
        }
      }

      const escaneo = await prisma.escaneoInstrumento.create({
        data: {
          cicloId: cicloActivo.id,
          instrumentoId: instrumento.id,
          etapa: Number(etapa),
          estadoFisico: estadoFisico
        },
        include: { instrumento: true }
      });

      return res.json({ 
        success: true, 
        escaneo, 
        ciclo: cicloActivo, 
        kit: instrumento.kit 
      });
    } catch (error) {
      console.error('Error al escanear instrumento:', error);
      return res.status(500).json({ success: false, message: 'Error interno al registrar el escaneo' });
    }
  },

  finalizarCiclo: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;
      const { 
        tipoEsterilizacion, autoclaveTipo, destinoSet, sedeDestino, quirofanoDestino, instrumentadorDestino, 
        tipoEmpaque, cintaTest, quimicoInterno, lote, valorIndicador,
        almacEstado, almacFechaIngreso, almacFechaVencimiento, almacUbicacion, almacObservacion
      } = req.body;
      const indicadorUrl = req.file ? `/uploads/evidencias/${req.file.filename}` : null;
      const cicloFinalizado = await prisma.cicloEsterilizacion.update({
        where: { id: Number(cicloId) },
        data: {
          estadoGlobal: 'Finalizado',
          etapaActual: 5,
          tipoEsterilizacion,
          autoclaveTipo,
          destinoSet,
          tipoSellado: tipoEmpaque, 
          cintaTest: cintaTest === 'true', 
          quimicoInterno: quimicoInterno === 'true',
          lote, 
          valorIndicador,
          ...(indicadorUrl && { indicadorUrl }),
          ...(destinoSet?.includes('Distribución') && {
            sedeDestinoId: sedeDestino ? Number(sedeDestino) : null,
            quirofanoDestino,
            instrumentadorDestino
          }),
          ...(destinoSet?.includes('Almacenamiento') && {
            almacEstado,
            almacFechaIngreso,
            almacFechaVencimiento,
            almacUbicacion,
            almacObservacion
          })
        }
      });
      const escaneos = await prisma.escaneoInstrumento.findMany({
        where: { cicloId: Number(cicloId) },
        select: { instrumentoId: true, estadoFisico: true }
      });
      const idsMalEstado = escaneos.filter(e => e.estadoFisico === 'Mal estado').map(e => e.instrumentoId);
      const idsBuenEstado = escaneos.filter(e => e.estadoFisico === 'Buen estado' && !idsMalEstado.includes(e.instrumentoId)).map(e => e.instrumentoId);

      if (idsMalEstado.length > 0) {
        await prisma.hojaVidaInstrumento.updateMany({
          where: { id: { in: idsMalEstado } },
          data: { estadoActual: 'Reproceso', estado: 'Deshabilitado' }
        });
      }

      if (idsBuenEstado.length > 0) {
        await prisma.hojaVidaInstrumento.updateMany({
          where: { id: { in: idsBuenEstado } },
          data: { estadoActual: 'Esterilizado', estado: 'Habilitado' }
        });
      }

      return res.json({ 
        success: true, 
        ciclo: cicloFinalizado, 
        message: 'El ciclo de esterilización ha sido completado.',
        alertaSecundaria: 'Resultado de esterilización registrado correctamente.'
      });
    } catch (error) {
      console.error('Error al finalizar el ciclo:', error);
      return res.status(500).json({ success: false, message: 'Error interno al finalizar el ciclo' });
    }
  },

  obtenerConteoEtapas: async (req: Request, res: Response) => {
    try {
      const conteosBD = await prisma.cicloEsterilizacion.groupBy({
        by: ['etapaActual'],
        where: { estadoGlobal: 'En Curso' },
        _count: { _all: true }
      });

      const mapaEtapas: { [key: number]: string } = {
        0: 'recepcion', 1: 'lavado', 2: 'secado', 3: 'sellado', 4: 'rotulado', 5: 'esterilizado'
      };

      const conteos: Record<string, number> = {
        recepcion: 0, lavado: 0, secado: 0, sellado: 0, rotulado: 0, esterilizado: 0
      };

      conteosBD.forEach(item => {
        const nombreEtapa = mapaEtapas[item.etapaActual];
        if (nombreEtapa) {
          conteos[nombreEtapa] = item._count._all;
        }
      });

      return res.json({ success: true, conteos });
    } catch (error) {
      console.error('Error al obtener conteo de etapas:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor al contar etapas' });
    }
  },

  obtenerHistoricoKit: async (req: Request, res: Response) => {
    try {
      const { kitId } = req.params;
      const instrumentos = await prisma.hojaVidaInstrumento.findMany({
        where: { kitId: Number(kitId) }
      });
      const idsInstrumentos = instrumentos.map(i => i.id);
      const todosLosEscaneos = await prisma.escaneoInstrumento.findMany({
        where: { instrumentoId: { in: idsInstrumentos } }
      });
      const dataFormateada = instrumentos.map(inst => {
        const historial = todosLosEscaneos.filter((e: any) => e.instrumentoId === inst.id);

        return {
          id: inst.id,
          name: inst.nombre || inst.codigo, 
          status: inst.estado === 'Habilitado' ? 'Activo' : 'Mantenimiento',
          l: historial.filter((e: any) => e.etapa === 1).length,
          s: historial.filter((e: any) => e.etapa === 2).length,
          se: historial.filter((e: any) => e.etapa === 3).length,
          r: historial.filter((e: any) => e.etapa === 4).length,
          e: historial.filter((e: any) => e.etapa === 5).length,
          c: historial.filter((e: any) => e.etapa === 6).length 
        };
      });

      return res.json(dataFormateada);
    } catch (error) {
      console.error('Error al obtener el historial del kit:', error);
      return res.status(500).json({ success: false, message: 'Error interno al buscar historial' });
    }
  },

  getTableroControl: async (req: Request, res: Response) => {
    try {
      const ciclosActivos = await prisma.cicloEsterilizacion.findMany({
        where: {
          estadoGlobal: "En Curso"
        },
        include: {
          kit: {
            select: {
              codigoKit: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              nombre: true,
              apellido: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      return res.json({ success: true, data: ciclosActivos });
    } catch (error) {
      console.error("❌ Error al obtener el tablero:", error);
      return res.status(500).json({ success: false, message: "Error al cargar el tablero de control." });
    }
  }
};