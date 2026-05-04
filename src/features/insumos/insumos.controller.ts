import { Request, Response } from 'express';
import { z } from 'zod';
import { InsumosService } from './insumos.service';
import { insumoSchema, toggleEstadoSchema } from './insumos.schema';

export const getListasSoporte = async (req: Request, res: Response) => {
  try {
    const listas = await InsumosService.obtenerListasSoporte();
    res.json(listas);
  } catch (error) {
    console.error("Error cargando listas soporte:", error);
    res.status(500).json({ msg: "Error al cargar listas de soporte" });
  }
};

export const getInsumos = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, insumos } = await InsumosService.obtenerTodos(page, limit, search, estadoFiltro);

    res.json({
      data: insumos,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener insumos" });
  }
};

export const createInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = insumoSchema.parse(req.body);
    const nuevoInsumo = await InsumosService.crear(dataValidada);
    res.status(201).json({ msg: "Insumo creado exitosamente", data: nuevoInsumo });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre o código del insumo ya existe" });
      return;
    }
    res.status(500).json({ msg: "Error al crear el insumo" });
  }
};

export const updateInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = insumoSchema.parse(req.body);
    
    const insumoActualizado = await InsumosService.actualizar(Number(id), dataValidada);
    res.json({ msg: "Insumo actualizado exitosamente", data: insumoActualizado });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre del insumo ya existe" });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar el insumo" });
  }
};

export const toggleEstadoInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = toggleEstadoSchema.parse(req.body);

    await InsumosService.cambiarEstado(Number(id), estado);
    res.json({ msg: `Insumo ${estado ? 'habilitado' : 'deshabilitado'} exitosamente` });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar el estado" });
  }
};