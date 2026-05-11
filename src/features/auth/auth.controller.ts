import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { loginSchema, recuperarPasswordSchema, cambiarPasswordSchema } from './auth.schema';

export const loginUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, usuario, password } = loginSchema.parse(req.body);
    const identificador = (email || usuario) as string;
    const user = await AuthService.login(identificador, password);
    res.json({ msg: 'Login exitoso', usuario: user });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'CREDENCIALES_INVALIDAS') {
        res.status(401).json({ msg: 'Usuario o contraseña incorrectos' });
        return;
      }
      if (error.message === 'USUARIO_INACTIVO') {
        res.status(403).json({ msg: 'Usuario inactivo. Contacte al administrador.' });
        return;
      }
    }
    console.error('Error en login:', error);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const recuperarPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, usuario } = recuperarPasswordSchema.parse(req.body);
    const identificador = (email || usuario) as string;
    await AuthService.recuperarPassword(identificador);
    res.json({ msg: 'Se ha enviado una contraseña provisional a su correo electrónico' });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'USUARIO_NO_ENCONTRADO') {
        res.status(404).json({ msg: 'El correo ingresado no está registrado en el sistema' });
        return;
      }
      if (error.message === 'SIN_CORREO') {
        res.status(500).json({ msg: 'El usuario no tiene un correo válido registrado.' });
        return;
      }
    }
    console.error('Error en recuperación:', error);
    res.status(500).json({ msg: 'Ocurrió un error al procesar la solicitud.' });
  }
};

export const cambiarPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, passwordActual, nuevaPassword } = cambiarPasswordSchema.parse(req.body);
    await AuthService.cambiarPassword(email, passwordActual, nuevaPassword);
    res.json({ msg: 'Contraseña actualizada exitosamente.' });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ msg: error.issues[0].message });
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'USUARIO_NO_ENCONTRADO' || error.message === 'PASSWORD_INCORRECTO') {
        res.status(400).json({ msg: 'La contraseña no coincide' });
        return;
      }
      if (error.message === 'PASSWORD_IGUAL') {
        res.status(400).json({ msg: 'La nueva contraseña no puede ser igual a la provisional' });
        return;
      }
    }
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ msg: 'Error al actualizar la contraseña.' });
  }
};