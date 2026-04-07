import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // 1. Extraer los filtros reales de la URL
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const kitPeriod = req.query.kitPeriod as string || 'Año';
    
    // Fechas de inicio y fin para el año seleccionado
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
    const yearFilter = { gte: startOfYear, lte: endOfYear };

    // =======================================================
    // 📊 CONSULTAS REALES A LA BASE DE DATOS (PRISMA)
    // =======================================================

    // A. TARJETAS DE GESTIÓN (Reportes y Mantenimientos Reales)
    const totalReportes = await prisma.reporte.count({ where: { createdAt: yearFilter } });
    const totalMantenimientos = await prisma.reporte.count({
      where: { createdAt: yearFilter, proveedorMantenimientoId: { not: null } }
    });

    // B. GRÁFICO CIRCULAR (Ciclos Reales y Efectividad)
    const ciclosExitosos = await prisma.cicloEsterilizacion.count({ where: { estadoGlobal: 'Finalizado', createdAt: yearFilter } });
    const ciclosFallidos = await prisma.cicloEsterilizacion.count({ where: { estadoGlobal: 'Cancelado', createdAt: yearFilter } });
    const totalCiclos = ciclosExitosos + ciclosFallidos;
    const efectividad = totalCiclos > 0 ? Math.round((ciclosExitosos / totalCiclos) * 100) : 100;

    // C. BARRAS: RECHAZOS (Agrupados por tipo de daño real)
    const rejectionsDB = await prisma.reporte.groupBy({
      by: ['tipoDano'],
      where: { createdAt: yearFilter },
      _count: { _all: true }
    });
    
    const rejectionsColors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
    const maxRejections = Math.max(...rejectionsDB.map(r => r._count._all), 1); // Para sacar porcentaje

    const dataRejections = rejectionsDB.map((r, i) => ({
      name: r.tipoDano,
      value: r._count._all,
      percentage: Math.round((r._count._all / maxRejections) * 100),
      color: rejectionsColors[i % rejectionsColors.length]
    })).sort((a, b) => b.value - a.value); // Ordenados de mayor a menor

    // D. LISTA: UTILIZACIÓN DE KITS (Top 5 kits más usados en Ciclos reales)
    // Filtro de fecha especial para Kits (Mes vs Año)
    let kitDateFilter = yearFilter;
    if (kitPeriod === 'Mes') {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      kitDateFilter = { gte: startOfMonth, lte: endOfYear };
    }

    const topKitsDB = await prisma.cicloEsterilizacion.groupBy({
      by: ['kitId'],
      where: { createdAt: kitDateFilter },
      _count: { _all: true },
      orderBy: { _count: { kitId: 'desc' } },
      take: 5
    });

    // Traer los nombres reales de los kits
    const kitsData = await Promise.all(topKitsDB.map(async (k) => {
      const kitInfo = await prisma.kit.findUnique({ 
        where: { id: k.kitId }, 
        include: { especialidad: true } 
      });
      return {
        esp: kitInfo?.especialidad?.nombre || 'General',
        codigo: kitInfo?.codigoKit || `Kit-${k.kitId}`,
        val: k._count._all,
        status: k._count._all > 10 ? 'up' : 'down' // Simulación de tendencia
      };
    }));

    // =======================================================
    // ⚠️ DATOS SIMULADOS (Hasta crear tablas en BD)
    // =======================================================
    
    // Tiempos por etapa (Necesitas tabla HistorialEtapas)
    const baseTime = year === 2025 ? 30 : 40; 
    const timeProcess = [
      { name: 'Recepción', min: 10, max: 45, avg: baseTime },
      { name: 'Lavado', min: 15, max: 35, avg: baseTime - 5 },
      { name: 'Secado', min: 20, max: 50, avg: baseTime + 5 },
      { name: 'Sellado', min: 10, max: 40, avg: baseTime - 2 },
      { name: 'Rotulado', min: 15, max: 45, avg: baseTime + 2 },
      { name: 'Esterilizado', min: 25, max: 60, avg: baseTime + 15 },
    ];

    // Repeticiones (Necesitas rastrear retrocesos en el ciclo)
    const repetitions = [
      { name: 'Recepción', value: year === 2025 ? 12 : 25 },
      { name: 'Lavado', value: year === 2025 ? 18 : 30 },
      { name: 'Secado', value: year === 2025 ? 45 : 60 },
      { name: 'Sellado', value: year === 2025 ? 8 : 15 },
      { name: 'Rotulado', value: year === 2025 ? 22 : 40 },
      { name: 'Esterilizado', value: year === 2025 ? 5 : 10 },
    ];

    // Consumos (Necesitas tabla TransaccionInsumo)
    const baseConsumo = req.query.insumo === 'Gasa' ? 50 : 150;
    const consumption = [
      { month: 'Ene', current: baseConsumo, previous: baseConsumo + 30 },
      { month: 'Feb', current: baseConsumo + 20, previous: baseConsumo + 20 },
      { month: 'Mar', current: baseConsumo + 25, previous: baseConsumo + 10 },
      { month: 'Abr', current: baseConsumo + 10, previous: baseConsumo + 40 },
      { month: 'May', current: baseConsumo + 40, previous: baseConsumo + 70 },
      { month: 'Jun', current: baseConsumo + 65, previous: baseConsumo + 50 },
      { month: 'Jul', current: baseConsumo + 60, previous: baseConsumo + 20 },
      { month: 'Ago', current: baseConsumo + 75, previous: baseConsumo + 5 },
      { month: 'Sept', current: baseConsumo + 100, previous: baseConsumo },
      { month: 'Oct', current: baseConsumo + 105, previous: baseConsumo + 30 },
      { month: 'Nov', current: baseConsumo + 45, previous: baseConsumo + 15 },
      { month: 'Dic', current: baseConsumo + 50, previous: baseConsumo },
    ];

    // =======================================================
    // 📤 RESPUESTA FINAL AL FRONTEND
    // =======================================================
    return res.json({
      success: true,
      summary: {
        avgTime: '3:10', // Calculado simulado
        totalReportes,
        efectividad,
        totalCiclos,
        totalMantenimientos,
        consumoPromedio: Math.round(consumption.reduce((acc, curr) => acc + curr.current, 0) / 12)
      },
      cycles: [
        { name: 'Exitosos', value: ciclosExitosos },
        { name: 'Fallidos', value: ciclosFallidos > 0 ? ciclosFallidos : 0.01 } // Para que la gráfica no se rompa si es 0
      ],
      rejections: dataRejections,
      kits: kitsData,
      timeProcess,
      repetitions,
      consumption
    });

  } catch (error) {
    console.error('Error calculando stats dashboard:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};