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
    // Tope duro: un kit no debería tener más de 200 instrumentos en
    // ningún caso real. Si lo tiene, el frontend muestra una vista
    // resumida y los registros excedentes quedan fuera.
    const instrumentos = await prisma.hojaVidaInstrumento.findMany({
      where: { kitId },
      take: 200,
    });

    if (instrumentos.length === 0) return [];

    const idsInstrumentos = instrumentos.map(i => i.id);

    // Antes traíamos TODOS los escaneos a memoria y filtrábamos en JS.
    // Con groupBy MySQL hace el conteo nativamente, evitando O(n²).
    const contadores = await prisma.escaneoInstrumento.groupBy({
      by: ['instrumentoId', 'etapa'],
      where: { instrumentoId: { in: idsInstrumentos } },
      _count: { _all: true },
    });

    type ContadorPorInstrumento = Record<number, Record<number, number>>;
    const conteos: ContadorPorInstrumento = {};
    for (const c of contadores) {
      conteos[c.instrumentoId] ??= {};
      conteos[c.instrumentoId][c.etapa] = c._count._all;
    }

    return instrumentos.map(inst => {
      const m = conteos[inst.id] ?? {};
      return {
        id: inst.id,
        name: inst.nombre || inst.codigo,
        status: inst.estado === 'Habilitado' ? 'Activo' : 'Mantenimiento',
        l:  m[1] ?? 0,
        s:  m[2] ?? 0,
        se: m[3] ?? 0,
        r:  m[4] ?? 0,
        e:  m[5] ?? 0,
        c:  m[6] ?? 0,
      };
    });
  }

  // Tablero de control paginado: ciclos en curso, más recientes primero.
  // Cap obligatorio: limit ≤ 100.
  static async obtenerTableroControl(pageInput?: number, limitInput?: number, search?: string) {
    const page = Math.max(1, Number.isFinite(pageInput) ? Number(pageInput) : 1);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitInput) ? Number(limitInput) : 20));
    const skip = (page - 1) * limit;

    const where: any = { estadoGlobal: 'En Curso' };
    if (search) {
      where.OR = [
        { codigoCiclo: { contains: search } },
        { kit: { codigoKit: { contains: search } } },
        { kit: { nombre: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.cicloEsterilizacion.count({ where }),
      prisma.cicloEsterilizacion.findMany({
        where,
        include: {
          kit: { select: { codigoKit: true, nombre: true } },
          responsable: { select: { nombre: true, apellido: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data, total, totalPages: Math.ceil(total / limit), currentPage: page };
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