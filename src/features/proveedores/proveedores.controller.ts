import { Request, Response } from 'express';
import { z } from 'zod';
import { ProveedoresService } from './proveedores.service';
import { proveedorSchema, toggleEstadoSchema } from './proveedores.schema';

export const getListasSoporte = async (req: Request, res: Response) => {
  res.json({ msg: "Utilizando API pública de ubicaciones en el frontend" });
};

export const getProveedores = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10; 
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, proveedores } = await ProveedoresService.obtenerTodos(page, limit, search, estadoFiltro);

    res.json({
      data: proveedores,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("❌ ERROR AL OBTENER PROVEEDORES:", error);
    res.status(500).json({ msg: "Error al obtener proveedores" });
  }
};

export const createProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = proveedorSchema.parse(req.body);
    const nuevoProveedor = await ProveedoresService.crear(dataValidada);
    
    res.status(201).json({ msg: "Proveedor creado exitosamente", data: nuevoProveedor });
  } catch (error: any) {
    console.error("❌ ERROR AL CREAR PROVEEDOR:", error); 
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El NIT o el código del proveedor ya existe" });
      return;
    }
    res.status(500).json({ msg: "Error al crear el proveedor en la base de datos." });
  }
};

export const updateProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = proveedorSchema.parse(req.body);
    
    const proveedorActualizado = await ProveedoresService.actualizar(Number(id), dataValidada);
    res.json({ msg: "Proveedor actualizado exitosamente", data: proveedorActualizado });
  } catch (error: any) {
    console.error("❌ ERROR AL ACTUALIZAR PROVEEDOR:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El NIT o el código del proveedor ya existe" });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar el proveedor" });
  }
};

export const toggleEstadoProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = toggleEstadoSchema.parse(req.body);

    await ProveedoresService.cambiarEstado(Number(id), estado);
    res.json({ msg: `Proveedor ${estado ? 'habilitado' : 'deshabilitado'} exitosamente` });
  } catch (error: any) {
    console.error("❌ ERROR AL CAMBIAR ESTADO:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar el estado" });
  }
};