import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CiclosService {
  static async obtenerCicloActivo(kitId: number) {
    return await prisma.cicloEsterilizacion.findFirst({
      where: { kitId, estadoGlobal: 'En Curso' },
      include: {
        escaneos: { include: { instrumento: true } },
        responsable: true,
        kit: { include: { especialidad: true, subespecialidad: true } }
      }
    });
  }

  static async avanzarEtapa(data: any) {
    return await prisma.cicloEsterilizacion.update({
      where: { id: data.cicloId },
      data: { 
        etapaActual: data.nuevaEtapa, 
        responsableActualId: data.responsableId,
        ...(data.tipoSellado && { tipoSellado: data.tipoSellado }) 
      }
    });
  }

  static async escanearInstrumento(data: any) {
    const instrumento = await prisma.hojaVidaInstrumento.findUnique({
      where: { codigo: data.codigoInstrumento },
      include: { kit: { include: { especialidad: true, subespecialidad: true } } }
    });

    if (!instrumento) throw new Error("INSTRUMENTO_NO_ENCONTRADO");
    if (!instrumento.kitId) throw new Error("SIN_KIT");

    let cicloActivo = null;

    if (!data.cicloId) {
      cicloActivo = await prisma.cicloEsterilizacion.findFirst({
        where: { kitId: instrumento.kitId, estadoGlobal: 'En Curso' }
      });
      
      if (!cicloActivo) {
        if (!data.responsableId) throw new Error("FALTA_FIRMA");
        
        cicloActivo = await prisma.cicloEsterilizacion.create({
          data: {
            kitId: instrumento.kitId,
            etapaActual: 0,
            responsableActualId: data.responsableId,
            codigoCiclo: `C-QX-${Date.now()}`
          }
        });
      }
    } else {
      cicloActivo = await prisma.cicloEsterilizacion.findUnique({ where: { id: data.cicloId } });
      if (!cicloActivo) throw new Error("CICLO_NO_ENCONTRADO");
    }

    const escaneo = await prisma.escaneoInstrumento.create({
      data: {
        cicloId: cicloActivo.id,
        instrumentoId: instrumento.id,
        etapa: data.etapa,
        estadoFisico: data.estadoFisico
      },
      include: { instrumento: true }
    });

    return { escaneo, cicloActivo, kit: instrumento.kit };
  }

  static async finalizarCiclo(cicloId: number, data: any, indicadorUrl: string | null) {
    const cicloFinalizado = await prisma.cicloEsterilizacion.update({
      where: { id: cicloId },
      data: {
        estadoGlobal: 'Finalizado',
        etapaActual: 5,
        tipoEsterilizacion: data.tipoEsterilizacion,
        autoclaveTipo: data.autoclaveTipo,
        destinoSet: data.destinoSet,
        tipoSellado: data.tipoEmpaque, 
        cintaTest: data.cintaTest === 'true', 
        quimicoInterno: data.quimicoInterno === 'true',
        lote: data.lote, 
        valorIndicador: data.valorIndicador,
        ...(indicadorUrl && { indicadorUrl }),
        ...(data.destinoSet?.includes('Distribución') && {
          sedeDestinoId: data.sedeDestino ? data.sedeDestino : null,
          quirofanoDestino: data.quirofanoDestino,
          instrumentadorDestino: data.instrumentadorDestino
        }),
        ...(data.destinoSet?.includes('Almacenamiento') && {
          almacEstado: data.almacEstado,
          almacFechaIngreso: data.almacFechaIngreso,
          almacFechaVencimiento: data.almacFechaVencimiento,
          almacUbicacion: data.almacUbicacion,
          almacObservacion: data.almacObservacion
        })
      }
    });

    const escaneos = await prisma.escaneoInstrumento.findMany({
      where: { cicloId },
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

    return cicloFinalizado;
  }

  static async obtenerConteoEtapas() {
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
      if (nombreEtapa) conteos[nombreEtapa] = item._count._all;
    });

    return conteos;
  }

  static async obtenerHistoricoKit(kitId: number) {
    const instrumentos = await prisma.hojaVidaInstrumento.findMany({
      where: { kitId }
    });
    
    const idsInstrumentos = instrumentos.map(i => i.id);
    const todosLosEscaneos = await prisma.escaneoInstrumento.findMany({
      where: { instrumentoId: { in: idsInstrumentos } }
    });

    return instrumentos.map(inst => {
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
  }

  static async obtenerTableroControl() {
    return await prisma.cicloEsterilizacion.findMany({
      where: { estadoGlobal: "En Curso" },
      include: {
        kit: { select: { codigoKit: true, nombre: true } },
        responsable: { select: { nombre: true, apellido: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  static async eliminarCiclo(id: number) {
    // Primero borra los escaneos (por restricción de llaves foráneas)
    await prisma.escaneoInstrumento.deleteMany({
      where: { cicloId: id }
    });
    // Luego borra el ciclo
    return await prisma.cicloEsterilizacion.delete({
      where: { id }
    });
  }
}