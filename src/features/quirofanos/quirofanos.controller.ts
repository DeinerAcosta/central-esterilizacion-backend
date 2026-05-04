import { Request, Response } from 'express';
import { z } from 'zod';
import { QuirofanosService } from './quirofanos.service';
import { quirofanoSchema, toggleEstadoSchema } from './quirofanos.schema';

export const getListasSoporte = async (req: Request, res: Response) => {
  try {
    const sedes = await QuirofanosService.obtenerListasSoporte();
    res.json({ sedes });
  } catch (error) {
    res.status(500).json({ msg: "Error al cargar sedes" });
  }
};

export const getQuirofanos = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, quirofanos } = await QuirofanosService.obtenerTodos(page, limit, search, estadoFiltro);

    res.json({ 
      data: quirofanos, 
      total, 
      totalPages: Math.ceil(total / limit), 
      currentPage: page 
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener quirófanos" });
  }
};

export const createQuirofano = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = quirofanoSchema.parse(req.body);
    const nuevo = await QuirofanosService.crear(dataValidada);
    
    res.status(201).json({ msg: "Quirófano creado correctamente", data: nuevo });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.message === "DUPLICADO") {
      res.status(400).json({ msg: "Este quirófano ya existe en la sede seleccionada" });
      return;
    }
    res.status(500).json({ msg: "Error al crear" });
  }
};

export const updateQuirofano = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = quirofanoSchema.parse(req.body);

    await QuirofanosService.actualizar(Number(id), dataValidada);
    res.json({ msg: "Quirófano actualizado correctamente" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar" });
  }
};

export const toggleEstadoQuirofano = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = toggleEstadoSchema.parse(req.body);

    await QuirofanosService.cambiarEstado(Number(id), dataValidada.estado);
    res.json({ msg: "Estado actualizado correctamente" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al cambiar estado" });
  }
};