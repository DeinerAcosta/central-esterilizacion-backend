import { Request, Response } from 'express';
import { z } from 'zod';
import { KitsService } from './kits.service';
import { createKitSchema, updateKitSchema, toggleEstadoSchema } from './kits.schema';

export const getKits = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10; 
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
    const especialidadId = req.query.especialidadId as string;
    const subespecialidadId = req.query.subespecialidadId as string;
    const sedeId = req.query.sedeId as string;

    const { total, kits } = await KitsService.obtenerTodos(
      page, limit, search, estadoFiltro, especialidadId, subespecialidadId, sedeId
    );

    res.json({ 
        data: kits, 
        total, 
        totalPages: Math.ceil(total / limit), 
        currentPage: page 
    });
  } catch (error) {
    console.error("Error al obtener kits:", error);
    res.status(500).json({ msg: "Error al obtener kits" });
  }
};

export const createKit = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = createKitSchema.parse(req.body);
    const nuevoKit = await KitsService.crear(dataValidada);
    
    res.status(201).json({ msg: "Kit creado correctamente", data: nuevoKit });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.message === "Especialidad o subespecialidad inválida") {
      res.status(400).json({ msg: error.message });
      return;
    }
    console.error("Error al crear kit:", error);
    res.status(500).json({ msg: "Error al crear el kit" });
  }
};

export const updateKit = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const dataValidada = updateKitSchema.parse(req.body);

        await KitsService.actualizar(Number(id), dataValidada);
        res.json({ msg: "Kit actualizado correctamente" });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ msg: error.issues[0].message });
            return;
        }
        console.error("Error al actualizar kit:", error);
        res.status(500).json({ msg: "Error al actualizar el kit" });
    }
};

export const toggleEstadoKit = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const dataValidada = toggleEstadoSchema.parse(req.body);

        await KitsService.cambiarEstado(Number(id), dataValidada.estado);
        res.json({ msg: "Estado actualizado correctamente" });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ msg: error.issues[0].message });
            return;
        }
        console.error("Error al cambiar estado:", error);
        res.status(500).json({ msg: "Error al cambiar el estado del kit" });
    }
};