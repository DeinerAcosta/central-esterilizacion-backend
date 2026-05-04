import { Request, Response } from 'express';
import { z } from 'zod';
import { SedesService } from './sedes.service';
import { sedeSchema, toggleEstadoSchema } from './sedes.schema';

export const getSedes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, sedes } = await SedesService.obtenerTodas(page, limit, search, estadoFiltro);

    res.json({ 
      data: sedes, 
      total, 
      totalPages: Math.ceil(total / limit), 
      currentPage: page 
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener sedes" });
  }
};

export const createSede = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = sedeSchema.parse(req.body);
    const nuevaSede = await SedesService.crear(dataValidada);
    
    res.status(201).json({ msg: "Sede creada correctamente", data: nuevaSede });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "Ya existe una sede con este nombre" });
      return;
    }
    res.status(500).json({ msg: "Error al crear la sede" });
  }
};

export const updateSede = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = sedeSchema.parse(req.body);

    await SedesService.actualizar(Number(id), dataValidada);
    res.json({ msg: "Sede actualizada correctamente" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "Ya existe otra sede con este nombre" });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar" });
  }
};

export const toggleEstadoSede = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = toggleEstadoSchema.parse(req.body);

    await SedesService.cambiarEstado(Number(id), dataValidada.estado);
    res.json({ msg: "Estado actualizado correctamente" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al cambiar estado" });
  }
};