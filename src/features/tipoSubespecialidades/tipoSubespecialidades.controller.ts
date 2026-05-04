import { Request, Response } from 'express';
import { z } from 'zod';
import { TipoSubespecialidadesService } from './tipoSubespecialidades.service';
import { tipoSubespecialidadSchema, toggleEstadoSchema } from './tipoSubespecialidades.schema';

export const getListasSoporte = async (req: Request, res: Response) => {
  try {
    const especialidades = await TipoSubespecialidadesService.obtenerListasSoporte();
    res.json({ especialidades });
  } catch (error) {
    res.status(500).json({ msg: "Error al cargar listas de soporte" });
  }
};

export const getTiposSub = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, registros } = await TipoSubespecialidadesService.obtenerTodos(page, limit, search, estadoFiltro);

    res.json({
      data: registros,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener datos" });
  }
};

export const createTipoSub = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = tipoSubespecialidadSchema.parse(req.body);
    const nuevo = await TipoSubespecialidadesService.crear(dataValidada.nombre, dataValidada.subespecialidadId);
    
    res.status(201).json({ msg: "Tipo de subespecialidad creado correctamente", data: nuevo });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al crear el registro" });
  }
};

export const updateTipoSub = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = tipoSubespecialidadSchema.parse(req.body);

    await TipoSubespecialidadesService.actualizar(Number(id), dataValidada.nombre, dataValidada.subespecialidadId);
    res.json({ msg: "Tipo de subespecialidad actualizado correctamente" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar" });
  }
};

export const toggleEstadoTipoSub = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = toggleEstadoSchema.parse(req.body);

    await TipoSubespecialidadesService.cambiarEstado(Number(id), dataValidada.estado);
    res.json({ msg: `Estado actualizado correctamente` });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al cambiar el estado" });
  }
};