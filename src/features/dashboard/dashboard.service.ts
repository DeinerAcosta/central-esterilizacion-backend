import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REJECTION_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

// Mapeo etapa numérica → nombre que pinta el dashboard.
const ETAPAS: Array<{ codigo: number; nombre: string }> = [
  { codigo: 0, nombre: 'Recepción' },
  { codigo: 1, nombre: 'Lavado' },
  { codigo: 2, nombre: 'Secado' },
  { codigo: 3, nombre: 'Sellado' },
  { codigo: 4, nombre: 'Rotulado' },
  { codigo: 5, nombre: 'Esterilizado' },
];

const MES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sept','Oct','Nov','Dic'];

const minutosEntre = (a: Date, b: Date) =>
  Math.max(1, Math.round((b.getTime() - a.getTime()) / 60000));

export class DashboardService {

  static async getStats(year: number, kitPeriod: string, insumo?: string) {
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear   = new Date(`${year}-12-31T23:59:59.999Z`);
    const yearFilter  = { gte: startOfYear, lte: endOfYear };

    // ─── Métricas principales ─────────────────────────────
    const [totalReportes, totalMantenimientos, ciclosExitosos, ciclosFallidos] = await Promise.all([
      prisma.reporte.count({ where: { createdAt: yearFilter } }),
      prisma.reporte.count({ where: { createdAt: yearFilter, proveedorMantenimientoId: { not: null } } }),
      prisma.cicloEsterilizacion.count({ where: { estadoGlobal: 'Finalizado', createdAt: yearFilter } }),
      prisma.cicloEsterilizacion.count({ where: { estadoGlobal: 'Cancelado',  createdAt: yearFilter } }),
    ]);

    const totalCiclos  = ciclosExitosos + ciclosFallidos;
    const efectividad  = totalCiclos > 0 ? Math.round((ciclosExitosos / totalCiclos) * 100) : 100;

    // ─── Rechazos por tipo de daño ────────────────────────
    const rejectionsDB = await prisma.reporte.groupBy({
      by:    ['tipoDano'],
      where: { createdAt: yearFilter },
      _count: { _all: true },
    });

    const maxRejections = Math.max(...rejectionsDB.map(r => r._count._all), 1);
    const rejections = rejectionsDB
      .map((r, i) => ({
        name:       r.tipoDano,
        value:      r._count._all,
        percentage: Math.round((r._count._all / maxRejections) * 100),
        color:      REJECTION_COLORS[i % REJECTION_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    // ─── Top kits más usados ──────────────────────────────
    let kitDateFilter = yearFilter;
    if (kitPeriod === 'Mes') {
      const today = new Date();
      kitDateFilter = { gte: new Date(today.getFullYear(), today.getMonth(), 1), lte: endOfYear };
    }

    const topKitsDB = await prisma.cicloEsterilizacion.groupBy({
      by:     ['kitId'],
      where:  { createdAt: kitDateFilter, kitId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { kitId: 'desc' } },
      take:   5,
    });

    const totalUsosKits = topKitsDB.reduce((sum, k) => sum + k._count._all, 0);

    const kits = await Promise.all(
      topKitsDB.map(async (k) => {
        const kitInfo = await prisma.kit.findUnique({
          where:   { id: k.kitId as number },
          include: { especialidad: true },
        });
        const usos = k._count._all;
        const porcentaje = totalUsosKits > 0 ? Math.round((usos / totalUsosKits) * 100) : 0;
        return {
          esp:    kitInfo?.especialidad?.nombre || 'General',
          codigo: kitInfo?.codigoKit            || `Kit-${k.kitId}`,
          val:    usos,
          porcentaje,
          status: usos > 10 ? 'up' : 'down',
        };
      })
    );

    // ─── Tiempo en proceso por etapa (datos reales) ───────
    // Para cada ciclo del año tomamos el primer escaneo de cada etapa.
    // El "tiempo" de la etapa N = minutos entre primer escaneo de N y primero de N+1.
    // El de Esterilizado (5) = minutos entre su primer escaneo y la última actualización del ciclo.
    const escaneos = await prisma.escaneoInstrumento.findMany({
      where: { ciclo: { createdAt: yearFilter } },
      select: { cicloId: true, etapa: true, createdAt: true },
      orderBy: [{ cicloId: 'asc' }, { createdAt: 'asc' }],
    });

    const primerosPorEtapa = new Map<number, Map<number, Date>>(); // cicloId → etapa → primer Date
    for (const e of escaneos) {
      if (!primerosPorEtapa.has(e.cicloId)) primerosPorEtapa.set(e.cicloId, new Map());
      const m = primerosPorEtapa.get(e.cicloId)!;
      if (!m.has(e.etapa)) m.set(e.etapa, e.createdAt);
    }

    const ciclosUpdated = await prisma.cicloEsterilizacion.findMany({
      where: { createdAt: yearFilter, id: { in: Array.from(primerosPorEtapa.keys()) } },
      select: { id: true, updatedAt: true },
    });
    const updatedById = new Map(ciclosUpdated.map(c => [c.id, c.updatedAt]));

    // Acumuladores por etapa
    const acumEtapa: Array<{ tiempos: number[] }> = ETAPAS.map(() => ({ tiempos: [] }));
    for (const [cicloId, mapa] of primerosPorEtapa.entries()) {
      for (let i = 0; i < ETAPAS.length; i++) {
        const inicio = mapa.get(ETAPAS[i].codigo);
        if (!inicio) continue;
        const fin = i + 1 < ETAPAS.length
          ? mapa.get(ETAPAS[i + 1].codigo) ?? updatedById.get(cicloId)
          : updatedById.get(cicloId);
        if (fin && fin.getTime() > inicio.getTime()) {
          acumEtapa[i].tiempos.push(minutosEntre(inicio, fin));
        }
      }
    }

    const timeProcess = ETAPAS.map((e, i) => {
      const ts = acumEtapa[i].tiempos;
      const min = ts.length ? Math.min(...ts) : 0;
      const max = ts.length ? Math.max(...ts) : 0;
      const avg = ts.length ? Math.round(ts.reduce((a, b) => a + b, 0) / ts.length) : 0;
      return { name: e.nombre, min, max, avg };
    });

    // Tiempo total promedio de un ciclo (formato H:MM)
    const totalMinPromedios = timeProcess.reduce((acc, t) => acc + t.avg, 0);
    const hh = Math.floor(totalMinPromedios / 60);
    const mm = totalMinPromedios % 60;
    const avgTime = `${hh}:${String(mm).padStart(2, '0')}`;

    // ─── Repeticiones por etapa (datos reales) ────────────
    // Un "rescaneo" del MISMO instrumento en la MISMA etapa del MISMO ciclo
    // cuenta como repetición. Total repeticiones = totalEscaneos - escaneosUnicos.
    const repetGrupos = await prisma.escaneoInstrumento.groupBy({
      by: ['etapa', 'cicloId', 'instrumentoId'],
      where: { ciclo: { createdAt: yearFilter } },
      _count: { _all: true },
    });

    const repetPorEtapa = new Map<number, number>();
    for (const g of repetGrupos) {
      if (g._count._all > 1) {
        repetPorEtapa.set(g.etapa, (repetPorEtapa.get(g.etapa) ?? 0) + (g._count._all - 1));
      }
    }
    const repetitions = ETAPAS.map(e => ({
      name: e.nombre,
      value: repetPorEtapa.get(e.codigo) ?? 0,
    }));

    // ─── Consumo de insumos por mes (datos reales) ────────
    // Suma de cantidades de MovimientoInsumoDetalle (tipo Consumo) por mes
    // del año actual ("current") y del año anterior ("previous").
    const consumption = await this.consumoMensual(year, insumo);
    const consumoPromedio = Math.round(
      consumption.reduce((acc, m) => acc + m.current, 0) / 12
    );

    return {
      summary: {
        avgTime,
        totalReportes,
        efectividad,
        totalCiclos,
        totalMantenimientos,
        consumoPromedio,
      },
      cycles: [
        { name: 'Exitosos', value: ciclosExitosos },
        { name: 'Fallidos', value: ciclosFallidos > 0 ? ciclosFallidos : 0.01 },
      ],
      rejections,
      kits,
      timeProcess,
      repetitions,
      consumption,
    };
  }

  /**
   * Consumo mensual de insumos para los años `year` (current) y `year - 1`
   * (previous), filtrado opcionalmente por nombre de insumo.
   */
  private static async consumoMensual(year: number, insumo?: string) {
    const inicio = new Date(`${year - 1}-01-01T00:00:00.000Z`);
    const fin    = new Date(`${year}-12-31T23:59:59.999Z`);

    const detalles = await prisma.movimientoInsumoDetalle.findMany({
      where: {
        movimiento: { tipo: 'Consumo', fecha: { gte: inicio, lte: fin } },
        ...(insumo ? { insumo: { nombre: { contains: insumo } } } : {}),
      },
      select: {
        cantidad: true,
        movimiento: { select: { fecha: true } },
      },
    });

    const matriz = { current: new Array<number>(12).fill(0), previous: new Array<number>(12).fill(0) };
    for (const d of detalles) {
      const f = d.movimiento.fecha;
      const y = f.getUTCFullYear();
      const m = f.getUTCMonth();
      if (y === year)         matriz.current[m]  += d.cantidad;
      else if (y === year - 1) matriz.previous[m] += d.cantidad;
    }

    return MES_LABELS.map((mes, i) => ({
      month: mes,
      current: matriz.current[i],
      previous: matriz.previous[i],
    }));
  }
}
