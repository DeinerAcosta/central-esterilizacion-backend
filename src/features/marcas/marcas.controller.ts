import { Request, Response } from 'express';
import { z } from 'zod';
import { MarcasService } from './marcas.service';
import { marcaSchema, toggleEstadoSchema } from './marcas.schema';

export const getMarcas = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, marcas } = await MarcasService.obtenerTodas(page, limit, search, estadoFiltro);

    res.json({ 
      data: marcas, 
      total, 
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Error en getMarcas:", error);
    res.status(500).json({ msg: "Error al obtener marcas" });
  }
};

export const createMarca = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = marcaSchema.parse(req.body);
    const nuevaMarca = await MarcasService.crear(dataValidada.nombre, dataValidada.estado);
    
    res.status(201).json({ msg: "Marca creada correctamente", data: nuevaMarca });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre de la marca ya existe." });
      return;
    }
    console.error("Error al crear marca:", error);
    res.status(500).json({ msg: "Error al crear la marca" });
  }
};

export const updateMarca = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = marcaSchema.parse(req.body);

    await MarcasService.actualizar(Number(id), dataValidada.nombre);
    res.json({ msg: "Marca actualizada correctamente" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre de la marca ya existe." });
      return;
    }
    console.error("Error al actualizar marca:", error);
    res.status(500).json({ msg: "Error al actualizar la marca" });
  }
};

export const toggleEstadoMarca = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = toggleEstadoSchema.parse(req.body);

    await MarcasService.cambiarEstado(Number(id), dataValidada.estado);
    res.json({ msg: "Estado de marca actualizado" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    console.error("Error al cambiar estado de marca:", error);
    res.status(500).json({ msg: "Error al cambiar el estado de la marca" });
  }
};