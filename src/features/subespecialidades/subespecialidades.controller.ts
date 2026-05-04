import { Request, Response } from 'express';
import { z } from 'zod';
import { SubespecialidadesService } from './subespecialidades.service';
import { subespecialidadSchema, toggleEstadoSchema } from './subespecialidades.schema';

export const getListasSoporte = async (req: Request, res: Response) => {
  try {
    const especialidades = await SubespecialidadesService.obtenerListasSoporte();
    res.json({ especialidades });
  } catch (error) {
    res.status(500).json({ msg: "Error al cargar listas de soporte" });
  }
};

export const getSubespecialidades = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, subespecialidades } = await SubespecialidadesService.obtenerTodas(page, limit, search, estadoFiltro);

    res.json({
      data: subespecialidades,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener subespecialidades" });
  }
};

export const createSubespecialidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = subespecialidadSchema.parse(req.body);
    const nuevaSubespecialidad = await SubespecialidadesService.crear(dataValidada.nombre, dataValidada.especialidadId);
    
    res.status(201).json({ msg: "Subespecialidad creada correctamente", data: nuevaSubespecialidad });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.message === "DUPLICADO") {
      res.status(400).json({ msg: "Esta subespecialidad ya existe para la especialidad seleccionada" });
      return;
    }
    res.status(500).json({ msg: "Error al crear la subespecialidad" });
  }
};

export const updateSubespecialidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = subespecialidadSchema.parse(req.body);

    const subActualizada = await SubespecialidadesService.actualizar(Number(id), dataValidada.nombre, dataValidada.especialidadId);
    res.json({ msg: "Subespecialidad actualizada correctamente", data: subActualizada });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.message === "DUPLICADO") {
      res.status(400).json({ msg: "Esta subespecialidad ya existe para la especialidad seleccionada" });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar la subespecialidad" });
  }
};

export const toggleEstadoSubespecialidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = toggleEstadoSchema.parse(req.body);

    await SubespecialidadesService.cambiarEstado(Number(id), dataValidada.estado);
    res.json({ msg: `Subespecialidad ${dataValidada.estado ? 'habilitada' : 'deshabilitada'} correctamente` });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar el estado" });
  }
};

export const obtenerConKits = async (req: Request, res: Response) => {
  try {
    const data = await SubespecialidadesService.obtenerConKits();
    res.json(data);
  } catch (error) {
    console.error('Error al obtener subespecialidades con kits:', error);
    res.status(500).json({ msg: "Error al obtener datos para el sidebar" });
  }
};