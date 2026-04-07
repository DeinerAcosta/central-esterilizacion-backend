import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const ciclosController = {
  // 1. Obtener el ciclo activo de un KIT (Si se necesita consultar manualmente)
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

  // 2. Avanzar de etapa (Dinámico, validando el Ciclo ID)
  avanzarEtapa: async (req: Request, res: Response) => {
    try {
      const { cicloId, responsableId, nuevaEtapa, tipoSellado } = req.body;

      if (!cicloId) {
        return res.status(400).json({ success: false, message: 'No hay ciclo activo para avanzar' });
      }

      // Actualizar la etapa del ciclo existente
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

  // 3. Escanear un instrumento (Detección Automática de Kit y Ciclo)
  escanearInstrumento: async (req: Request, res: Response) => {
    try {
      const { cicloId, codigoInstrumento, etapa, estadoFisico, responsableId } = req.body;

      // Buscar el instrumento real y traer la info de su KIT
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

      // DETECCIÓN AUTOMÁTICA DEL KIT: Si no hay cicloId en la petición, es el primer escaneo
      if (!cicloId) {
        // Revisamos si alguien más ya había iniciado un ciclo para este Kit hoy
        cicloActivo = await prisma.cicloEsterilizacion.findFirst({
          where: { kitId: instrumento.kitId, estadoGlobal: 'En Curso' }
        });

        // Si no existe un ciclo, lo creamos automáticamente para el Kit detectado
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
        // Si ya había un cicloId, lo buscamos para asegurarnos de que existe
        cicloActivo = await prisma.cicloEsterilizacion.findUnique({ 
          where: { id: Number(cicloId) } 
        });
        
        if (!cicloActivo) {
          return res.status(404).json({ success: false, message: 'Ciclo no encontrado' });
        }
      }

      // Guardar el escaneo en la BD amarrado al ciclo correcto
      const escaneo = await prisma.escaneoInstrumento.create({
        data: {
          cicloId: cicloActivo.id,
          instrumentoId: instrumento.id,
          etapa: Number(etapa),
          estadoFisico: estadoFisico
        },
        include: { instrumento: true }
      });

      // Devolvemos todo estructurado para que React actualice la pantalla visualmente
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

  // 4. Finalizar el Ciclo (CON AUTOMATIZACIÓN DE INSTRUMENTOS SPRINT 3)
  finalizarCiclo: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;
      
      // Recibimos absolutamente todos los campos del FormData de React
      const { 
        tipoEsterilizacion, autoclaveTipo, destinoSet, sedeDestino, quirofanoDestino, instrumentadorDestino, 
        tipoEmpaque, cintaTest, quimicoInterno, lote, valorIndicador,
        almacEstado, almacFechaIngreso, almacFechaVencimiento, almacUbicacion, almacObservacion
      } = req.body;

      const indicadorUrl = req.file ? `/uploads/evidencias/${req.file.filename}` : null;

      // 1. CERRAR EL CICLO Y GUARDAR LOS DATOS FINALES
      const cicloFinalizado = await prisma.cicloEsterilizacion.update({
        where: { id: Number(cicloId) },
        data: {
          estadoGlobal: 'Finalizado',
          etapaActual: 5,
          tipoEsterilizacion,
          autoclaveTipo,
          destinoSet,
          
          // Datos de Rotulado
          tipoSellado: tipoEmpaque, 
          cintaTest: cintaTest === 'true', 
          quimicoInterno: quimicoInterno === 'true',
          lote, 
          valorIndicador,
          ...(indicadorUrl && { indicadorUrl }),

          // Datos dinámicos de Distribución
          ...(destinoSet?.includes('Distribución') && {
            sedeDestinoId: sedeDestino ? Number(sedeDestino) : null,
            quirofanoDestino,
            instrumentadorDestino
          }),

          // Datos dinámicos de Almacenamiento
          ...(destinoSet?.includes('Almacenamiento') && {
            almacEstado,
            almacFechaIngreso,
            almacFechaVencimiento,
            almacUbicacion,
            almacObservacion
          })
        }
      });

      // =========================================================
      // 🚨 REGLAS SPRINT 3: ACTUALIZACIÓN DE INSTRUMENTOS 🚨
      // =========================================================
      
      // Consultamos todos los escaneos de este ciclo
      const escaneos = await prisma.escaneoInstrumento.findMany({
        where: { cicloId: Number(cicloId) },
        select: { instrumentoId: true, estadoFisico: true }
      });

      // Separamos los IDs según su estado físico detectado
      const idsMalEstado = escaneos.filter(e => e.estadoFisico === 'Mal estado').map(e => e.instrumentoId);
      // Evitamos que un instrumento malo se cuente como bueno si fue escaneado dos veces
      const idsBuenEstado = escaneos.filter(e => e.estadoFisico === 'Buen estado' && !idsMalEstado.includes(e.instrumentoId)).map(e => e.instrumentoId);

      // Regla 1: Marcar instrumentos en mal estado como "No disponibles" y enviarlos a "Reproceso"
      if (idsMalEstado.length > 0) {
        await prisma.hojaVidaInstrumento.updateMany({
          where: { id: { in: idsMalEstado } },
          data: { 
            estadoActual: 'Reproceso', 
            estado: 'Deshabilitado' // Bloqueado según el documento
          }
        });
      }

      // Regla 2: Marcar instrumentos buenos como "Esterilizados" y "Habilitarlos" para distribución
      if (idsBuenEstado.length > 0) {
        await prisma.hojaVidaInstrumento.updateMany({
          where: { id: { in: idsBuenEstado } },
          data: { 
            estadoActual: 'Esterilizado', 
            estado: 'Habilitado' 
          }
        });
      }

      return res.json({ 
        success: true, 
        ciclo: cicloFinalizado, 
        message: 'El ciclo de esterilización ha sido completado.', // Texto exacto exigido en el Sprint 3
        alertaSecundaria: 'Resultado de esterilización registrado correctamente.'
      });
    } catch (error) {
      console.error('Error al finalizar el ciclo:', error);
      return res.status(500).json({ success: false, message: 'Error interno al finalizar el ciclo' });
    }
  },

  // 5. Obtener conteo de kits por etapa en tiempo real (Para el menú lateral)
  obtenerConteoEtapas: async (req: Request, res: Response) => {
    try {
      // Agrupamos y contamos cuántos ciclos "En Curso" hay por cada etapaActual
      const conteosBD = await prisma.cicloEsterilizacion.groupBy({
        by: ['etapaActual'],
        where: { estadoGlobal: 'En Curso' },
        _count: {
          _all: true
        }
      });

      // Mapa para convertir el número de etapa en la llave que espera el Frontend
      const mapaEtapas: { [key: number]: string } = {
        0: 'recepcion',
        1: 'lavado',
        2: 'secado',
        3: 'sellado',
        4: 'rotulado',
        5: 'esterilizado'
      };

      // Inicializamos en 0 por defecto
      const conteos: Record<string, number> = {
        recepcion: 0, lavado: 0, secado: 0, sellado: 0, rotulado: 0, esterilizado: 0
      };

      // Llenamos el objeto con los datos reales que devolvió Prisma
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
  }
};