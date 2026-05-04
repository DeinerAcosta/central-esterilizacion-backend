import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TrazabilidadService {
  static async obtenerTrazabilidad(params: any) {
    const { page, limit, tab, especialidadId, subespecialidadId, kitId, sedeId, fechaDesde, fechaHasta } = params;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (tab === 'asignaciones') {
      whereClause.destinoSet = { contains: 'Distribución' };
    } else {
      whereClause.estadoGlobal = { in: ['Finalizado', 'Cancelado', 'Entregado'] };
    }

    if (fechaDesde || fechaHasta) {
      whereClause.updatedAt = {};
      if (fechaDesde) whereClause.updatedAt.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      if (fechaHasta) whereClause.updatedAt.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
    }

    if (especialidadId || subespecialidadId) {
      whereClause.kit = {};
      if (especialidadId) whereClause.kit.especialidadId = Number(especialidadId);
      if (subespecialidadId) whereClause.kit.subespecialidadId = Number(subespecialidadId);
    }

    if (kitId) whereClause.kitId = Number(kitId);
    if (sedeId) whereClause.sedeDestinoId = Number(sedeId);

    const [total, ciclos] = await Promise.all([
      prisma.cicloEsterilizacion.count({ where: whereClause }),
      prisma.cicloEsterilizacion.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          kit: { include: { especialidad: true, subespecialidad: true } },
          sedeDestino: true
        },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    const formattedData = ciclos.map((c: any) => ({
      id: c.id,
      fecha: new Date(c.updatedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
      qui: c.quirofanoDestino || 'N/A',
      sede: c.sedeDestino?.nombre || 'N/A',
      esp: c.kit?.especialidad?.nombre || 'General',
      sub: c.kit?.subespecialidad?.nombre || 'N/A',
      tipo: c.kit?.tipoSubespecialidad || 'N/A',
      kit: c.kit?.codigoKit || 'N/A',
      instr: c.instrumentadorDestino || 'N/A',
      estadoGlobal: c.estadoGlobal
    }));

    return { total, ciclos: formattedData };
  }

  static async obtenerInstrumentosAsignacion(cicloId: number) {
    const escaneos = await prisma.escaneoInstrumento.findMany({
      where: { cicloId },
      include: { instrumento: true }
    });

    const instrumentosUnicos = Array.from(new Map(escaneos.map((e: any) => [e.instrumentoId, e.instrumento])).values());
    
    return instrumentosUnicos.map((inst: any) => ({
      id: inst.id,
      nombre: inst.nombre,
      codigo: inst.codigo,
      imagen: inst.fotoUrl || inst.imagen || inst.foto || null 
    }));
  }

  static async aprobarAsignacion(cicloId: number, instrumentos: any[]) {
    return await prisma.$transaction(async (tx) => {
      for (const inst of instrumentos) {
        const nuevoEstado = inst.estado === 'aprobado' ? 'Habilitado' : 'Deshabilitado';        
        await tx.hojaVidaInstrumento.update({
          where: { id: Number(inst.id) },
          data: { estadoActual: nuevoEstado }
        });
      }
      await tx.cicloEsterilizacion.update({
        where: { id: cicloId },
        data: { estadoGlobal: 'Entregado' }
      });
    });
  }

  static async obtenerDetallesCiclo(cicloId: number) {
    const ciclo: any = await prisma.cicloEsterilizacion.findUnique({
      where: { id: cicloId },
      include: {
        kit: { include: { especialidad: true, subespecialidad: true } },
        responsable: true,
        sedeDestino: true,
        escaneos: { include: { instrumento: true } }
      }
    });

    if (!ciclo) throw new Error("CICLO_NO_ENCONTRADO");

    const fechaInicio = new Date(ciclo.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    const fechaFin = new Date(ciclo.updatedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    
    const escaneosUnicos = Array.from(new Map(ciclo.escaneos.map((e: any) => [e.instrumentoId, e])).values()) as any[];
    
    const mapearInstrumentoConFoto = (e: any) => ({
      ...e.instrumento,
      imagen: e.instrumento.fotoUrl || e.instrumento.imagen || e.instrumento.foto || null
    });

    const instrumentosBuenos = escaneosUnicos
      .filter((e: any) => e.instrumento.estadoActual === 'Habilitado' || e.instrumento.estadoActual === 'Esterilizado')
      .map(mapearInstrumentoConFoto);        
    
    const instrumentosMalos = escaneosUnicos
      .filter((e: any) => e.instrumento.estadoActual === 'Deshabilitado' || e.instrumento.estadoActual === 'Reproceso')
      .map(mapearInstrumentoConFoto);

    const timeline = [
      { label: 'Recepción', time: fechaInicio, completed: true },
      { label: 'Lavado', time: fechaInicio, completed: ciclo.etapaActual >= 1 },
      { label: 'Secado', time: fechaInicio, completed: ciclo.etapaActual >= 2 },
      { label: 'Sellado', time: fechaInicio, completed: ciclo.etapaActual >= 3 },
      { label: 'Rotulado', time: fechaInicio, completed: ciclo.etapaActual >= 4 },
      { label: 'Esterilizado', time: fechaFin, completed: ciclo.etapaActual >= 5 },
      { 
        label: ciclo.destinoSet || 'Distribución', 
        subLabel: ciclo.destinoSet?.includes('Distribución') ? `${ciclo.quirofanoDestino} - ${ciclo.sedeDestino?.nombre || 'Sede'}` : undefined,
        time: fechaFin, 
        completed: ciclo.estadoGlobal === 'Finalizado' || ciclo.estadoGlobal === 'Entregado',
        highlight: true 
      }
    ];

    return {
      codigoCiclo: ciclo.codigoCiclo || `CQX-${ciclo.id.toString().padStart(5, '0')}`,
      kit: `${ciclo.kit?.codigoKit || '00'} - ${ciclo.kit?.especialidad?.nombre || 'General'}`,
      maquina: `${ciclo.tipoEsterilizacion || 'No def.'} ${ciclo.autoclaveTipo ? `(${ciclo.autoclaveTipo})` : ''}`,
      empaque: ciclo.tipoSellado || '-',
      lote: ciclo.lote || '-',
      responsable: ciclo.responsable?.nombre ? `${ciclo.responsable.nombre} ${ciclo.responsable.apellido}` : 'Sistema',
      evidencia: ciclo.indicadorUrl,
      fechaReal: fechaFin,
      espReal: ciclo.kit?.especialidad?.nombre || 'N/A',
      subReal: ciclo.kit?.subespecialidad?.nombre || 'N/A',
      tipoReal: ciclo.kit?.tipoSubespecialidad || 'N/A',
      codigoKitReal: ciclo.kit?.codigoKit || 'N/A',
      instrumentosBuenos,
      instrumentosMalos,
      timeline
    };
  }
}