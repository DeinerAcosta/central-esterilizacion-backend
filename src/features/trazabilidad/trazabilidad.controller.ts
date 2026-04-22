import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const trazabilidadController = {
  getTrazabilidad: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;
      const tab = req.query.tab as string || 'asignaciones';
      const especialidadId = req.query.especialidadId as string;
      const subespecialidadId = req.query.subespecialidadId as string;
      const kitId = req.query.kitId as string; 
      const sedeId = req.query.sedeId as string; 
      const fechaDesde = req.query.fechaDesde as string;
      const fechaHasta = req.query.fechaHasta as string;
      const whereClause: any = {};
      if (tab === 'asignaciones') {
        whereClause.destinoSet = { contains: 'Distribución' };
      } else {
        whereClause.estadoGlobal = { in: ['Finalizado', 'Cancelado', 'Entregado'] };
      }
      if (fechaDesde || fechaHasta) {
        whereClause.updatedAt = {};
        if (fechaDesde) {
          whereClause.updatedAt.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
        }
        if (fechaHasta) {
          whereClause.updatedAt.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
        }
      }
      if (especialidadId || subespecialidadId) {
        whereClause.kit = {};
        if (especialidadId) whereClause.kit.especialidadId = Number(especialidadId);
        if (subespecialidadId) whereClause.kit.subespecialidadId = Number(subespecialidadId);
      }
      if (kitId) {
        whereClause.kitId = Number(kitId);
      }
      if (sedeId) {
        whereClause.sedeDestinoId = Number(sedeId);
      }
      const [total, ciclos] = await Promise.all([
        prisma.cicloEsterilizacion.count({ where: whereClause }),
        prisma.cicloEsterilizacion.findMany({
          where: whereClause,
          skip,
          take: limit,
          include: {
            kit: {
              include: { especialidad: true, subespecialidad: true }
            },
            sedeDestino: true
          },
          orderBy: { updatedAt: 'desc' }
        })
      ]);
      const formattedData = ciclos.map(c => ({
        id: c.id,
        fecha: new Date(c.updatedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
        qui: c.quirofanoDestino || 'N/A',
        sede: c.sedeDestino?.nombre || 'N/A',
        esp: (c as any).kit?.especialidad?.nombre || 'General',
        sub: (c as any).kit?.subespecialidad?.nombre || 'N/A',
        tipo: (c as any).kit?.tipoSubespecialidad || 'N/A',
        kit: (c as any).kit?.codigoKit || 'N/A',
        instr: c.instrumentadorDestino || 'N/A',
        estadoGlobal: c.estadoGlobal
      }));

      return res.json({
        success: true,
        data: formattedData,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      });

    } catch (error) {
      console.error('Error obteniendo trazabilidad:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  },

  getInstrumentosAsignacion: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;
      const escaneos = await prisma.escaneoInstrumento.findMany({
        where: { cicloId: Number(cicloId) },
        include: { instrumento: true }
      });
      const instrumentosUnicos = Array.from(new Map(escaneos.map((e: any) => [e.instrumentoId, e.instrumento])).values());
      const data = instrumentosUnicos.map((inst: any) => ({
        id: inst.id,
        nombre: inst.nombre,
        codigo: inst.codigo,
        imagen: inst.fotoUrl || inst.imagen || inst.foto || null 
      }));

      return res.json({ success: true, data });
    } catch (error) {
      console.error('Error obteniendo instrumentos:', error);
      return res.status(500).json({ success: false, message: 'Error al cargar instrumentos' });
    }
  },

  aprobarAsignacion: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;
      const { instrumentos } = req.body; 
      if (!instrumentos || !Array.isArray(instrumentos)) {
          return res.status(400).json({ success: false, message: 'Formato de instrumentos inválido' });
      }
      await prisma.$transaction(async (tx) => {
        for (const inst of instrumentos) {
          const nuevoEstado = inst.estado === 'aprobado' ? 'Habilitado' : 'Deshabilitado';         
          await tx.hojaVidaInstrumento.update({
            where: { id: Number(inst.id) },
            data: { estadoActual: nuevoEstado }
          });
        }
        await tx.cicloEsterilizacion.update({
          where: { id: Number(cicloId) },
          data: { estadoGlobal: 'Entregado' }
        });
      });
      return res.json({ success: true, message: 'Aprobación guardada correctamente' });
    } catch (error) {
      console.error('Error aprobando asignación:', error);
      return res.status(500).json({ success: false, message: 'Error al procesar la aprobación' });
    }
  },

  getDetallesCiclo: async (req: Request, res: Response) => {
    try {
      const { cicloId } = req.params;
      const ciclo = await prisma.cicloEsterilizacion.findUnique({
        where: { id: Number(cicloId) },
        include: {
          kit: { include: { especialidad: true, subespecialidad: true } },
          responsable: true,
          sedeDestino: true,
          escaneos: { include: { instrumento: true } }
        }
      });
      if (!ciclo) return res.status(404).json({ success: false, message: 'Ciclo no encontrado' });
      const fechaInicio = new Date(ciclo.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
      const fechaFin = new Date(ciclo.updatedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
      const c = ciclo as any;
      const escaneosUnicos = Array.from(new Map(c.escaneos.map((e: any) => [e.instrumentoId, e])).values()) as any[];
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
        { label: 'Lavado', time: fechaInicio, completed: c.etapaActual >= 1 },
        { label: 'Secado', time: fechaInicio, completed: c.etapaActual >= 2 },
        { label: 'Sellado', time: fechaInicio, completed: c.etapaActual >= 3 },
        { label: 'Rotulado', time: fechaInicio, completed: c.etapaActual >= 4 },
        { label: 'Esterilizado', time: fechaFin, completed: c.etapaActual >= 5 },
        { 
          label: c.destinoSet || 'Distribución', 
          subLabel: c.destinoSet?.includes('Distribución') ? `${c.quirofanoDestino} - ${c.sedeDestino?.nombre || 'Sede'}` : undefined,
          time: fechaFin, 
          completed: c.estadoGlobal === 'Finalizado' || c.estadoGlobal === 'Entregado',
          highlight: true 
        }
      ];
      const data = {
        codigoCiclo: c.codigoCiclo || `CQX-${c.id.toString().padStart(5, '0')}`,
        kit: `${c.kit?.codigoKit || '00'} - ${c.kit?.especialidad?.nombre || 'General'}`,
        maquina: `${c.tipoEsterilizacion || 'No def.'} ${c.autoclaveTipo ? `(${c.autoclaveTipo})` : ''}`,
        empaque: c.tipoSellado || '-',
        lote: c.lote || '-',
        responsable: c.responsable?.nombre ? `${c.responsable.nombre} ${c.responsable.apellido}` : 'Sistema',
        evidencia: c.indicadorUrl,
        fechaReal: fechaFin,
        espReal: c.kit?.especialidad?.nombre || 'N/A',
        subReal: c.kit?.subespecialidad?.nombre || 'N/A',
        tipoReal: c.kit?.tipoSubespecialidad || 'N/A',
        codigoKitReal: c.kit?.codigoKit || 'N/A',
        instrumentosBuenos,
        instrumentosMalos,
        timeline
      };

      return res.json({ success: true, data });
    } catch (error) {
      console.error('Error cargando detalles del ciclo:', error);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
};