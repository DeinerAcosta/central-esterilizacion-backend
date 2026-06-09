import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REJECTION_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

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

    // Total de usos del período para calcular porcentaje de utilización por kit.
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
          porcentaje, // ✨ Nuevo — % de utilización dentro del período seleccionado
          status: usos > 10 ? 'up' : 'down',
        };
      })
    );

    // ─── Datos estáticos de proceso ───────────────────────
    const baseTime = year === 2025 ? 30 : 40;
    const timeProcess = [
      { name: 'Recepción',    min: 10, max: 45, avg: baseTime },
      { name: 'Lavado',       min: 15, max: 35, avg: baseTime - 5 },
      { name: 'Secado',       min: 20, max: 50, avg: baseTime + 5 },
      { name: 'Sellado',      min: 10, max: 40, avg: baseTime - 2 },
      { name: 'Rotulado',     min: 15, max: 45, avg: baseTime + 2 },
      { name: 'Esterilizado', min: 25, max: 60, avg: baseTime + 15 },
    ];

    const repetitions = [
      { name: 'Recepción',    value: year === 2025 ? 12 : 25 },
      { name: 'Lavado',       value: year === 2025 ? 18 : 30 },
      { name: 'Secado',       value: year === 2025 ? 45 : 60 },
      { name: 'Sellado',      value: year === 2025 ?  8 : 15 },
      { name: 'Rotulado',     value: year === 2025 ? 22 : 40 },
      { name: 'Esterilizado', value: year === 2025 ?  5 : 10 },
    ];

    const baseConsumo = insumo === 'Gasa' ? 50 : 150;
    const consumption = [
      { month: 'Ene',  current: baseConsumo,        previous: baseConsumo + 30 },
      { month: 'Feb',  current: baseConsumo + 20,   previous: baseConsumo + 20 },
      { month: 'Mar',  current: baseConsumo + 25,   previous: baseConsumo + 10 },
      { month: 'Abr',  current: baseConsumo + 10,   previous: baseConsumo + 40 },
      { month: 'May',  current: baseConsumo + 40,   previous: baseConsumo + 70 },
      { month: 'Jun',  current: baseConsumo + 65,   previous: baseConsumo + 50 },
      { month: 'Jul',  current: baseConsumo + 60,   previous: baseConsumo + 20 },
      { month: 'Ago',  current: baseConsumo + 75,   previous: baseConsumo +  5 },
      { month: 'Sept', current: baseConsumo + 100,  previous: baseConsumo },
      { month: 'Oct',  current: baseConsumo + 105,  previous: baseConsumo + 30 },
      { month: 'Nov',  current: baseConsumo + 45,   previous: baseConsumo + 15 },
      { month: 'Dic',  current: baseConsumo + 50,   previous: baseConsumo },
    ];

    const consumoPromedio = Math.round(
      consumption.reduce((acc, curr) => acc + curr.current, 0) / 12
    );

    return {
      summary: {
        avgTime:         '3:10',
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
}