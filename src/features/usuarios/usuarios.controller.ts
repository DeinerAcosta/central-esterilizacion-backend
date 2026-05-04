import { Request, Response } from 'express';
import { z } from 'zod';
import { UsuariosService } from './usuarios.service';
import { createUsuarioSchema, updateUsuarioSchema, toggleEstadoSchema, validarPinSchema } from './usuarios.schema';

export const getUsuarios = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const { total, usuarios } = await UsuariosService.obtenerTodos(page, 10, search, estadoFiltro);
    res.json({ data: usuarios, total, totalPages: Math.ceil(total / 10) });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener usuarios" });
  }
};

export const createUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const dataValidada = createUsuarioSchema.parse(req.body);
    const nuevo = await UsuariosService.crear(dataValidada);
    res.status(201).json({ msg: "Usuario creado correctamente. Se ha enviado el código al correo.", data: nuevo });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El correo electrónico ya está registrado." });
      return;
    }
    res.status(500).json({ msg: "Error al crear el usuario" });
  }
};

export const updateUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dataValidada = updateUsuarioSchema.parse(req.body);
    await UsuariosService.actualizar(Number(id), dataValidada);
    res.json({ msg: "Usuario actualizado correctamente" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El correo ya está registrado a otra persona." });
      return;
    }
    res.status(500).json({ msg: "Error al actualizar el usuario." });
  }
};

export const toggleEstadoUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = toggleEstadoSchema.parse(req.body);
    await UsuariosService.cambiarEstado(Number(id), estado);
    res.json({ msg: "Estado actualizado correctamente" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    res.status(500).json({ msg: "Error al cambiar estado" });
  }
};

export const validarPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin } = validarPinSchema.parse(req.body);
    const usuario = await UsuariosService.validarPin(pin);
    if (usuario) {
      res.json({ valid: true, usuario });
    } else {
      res.json({ valid: false });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ valid: false, message: error.issues[0].message });
      return;
    }
    res.status(500).json({ valid: false, message: 'Error interno' });
  }
};