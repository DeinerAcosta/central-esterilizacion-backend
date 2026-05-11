import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const year      = parseInt(req.query.year as string)      || new Date().getFullYear();
    const kitPeriod = (req.query.kitPeriod as string)         || 'Año';
    const insumo    = req.query.insumo as string | undefined;

    const data = await DashboardService.getStats(year, kitPeriod, insumo);

    return res.json({ success: true, ...data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error calculando stats dashboard:', msg);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};