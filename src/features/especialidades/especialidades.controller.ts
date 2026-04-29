import { Request, Response } from 'express';
import { z } from 'zod';
import { EspecialidadesService } from './especialidades.service';
import { especialidadSchema, toggleEstadoSchema } from './especialidades.schema';

export const getEspecialidades = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, especialidades } = await EspecialidadesService.obtenerTodas(page, limit, search, estadoFiltro);

    res.json({
      data: especialidades,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener especialidades" });
  }
};

export const createEspecialidad = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validación de Zod
    const { nombre } = especialidadSchema.parse(req.body);
    
    // 2. Ejecutar servicio
    const nuevaEspecialidad = await EspecialidadesService.crear(nombre);
    res.status(201).json({ msg: "Especialidad creada correctamente", data: nuevaEspecialidad });
    
  } catch (error: any) {
    // Captura errores de validación de Zod usando .issues
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    // Captura errores de unicidad de Prisma
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre de la especialidad ya existe" });
      return;
    }
    res.status(500).json({ msg: "Error al crear la especialidad" });
  }
};

export const updateEspecialidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre } = especialidadSchema.parse(req.body);
    
    const especialidadActualizada = await EspecialidadesService.actualizar(Number(id), nombre);
    res.json({ msg: "Especialidad actualizada correctamente", data: especialidadActualizada });
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre de la especialidad ya existe" });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar la especialidad" });
  }
};

export const toggleEstadoEspecialidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = toggleEstadoSchema.parse(req.body);

    await EspecialidadesService.cambiarEstado(Number(id), estado);
    res.json({ msg: `Especialidad ${estado ? 'habilitada' : 'deshabilitada'} correctamente` });
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar el estado" });
  }
};