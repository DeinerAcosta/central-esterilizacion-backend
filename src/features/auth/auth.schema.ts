import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().optional(),
  usuario:  z.string().optional(),
  password: z.string({ message: 'La contraseña es requerida' }).min(1, 'La contraseña no puede estar vacía'),
}).refine(data => data.email || data.usuario, {
  message: 'Debe ingresar su usuario o correo electrónico',
});

export const recuperarPasswordSchema = z.object({
  email:   z.string().optional(),
  usuario: z.string().optional(),
}).refine(data => data.email || data.usuario, {
  message: 'Debe ingresar su usuario o correo electrónico',
});

export const cambiarPasswordSchema = z.object({
  email:           z.string({ message: 'El correo es requerido' }).email('Correo inválido'),
  passwordActual:  z.string({ message: 'La contraseña actual es requerida' }).min(1),
  nuevaPassword:   z.string({ message: 'La nueva contraseña es requerida' })
    .min(8, 'La contraseña debe tener mínimo 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, 'Falta seguridad en la contraseña'),
});

export type LoginInput            = z.infer<typeof loginSchema>;
export type RecuperarPasswordInput = z.infer<typeof recuperarPasswordSchema>;
export type CambiarPasswordInput  = z.infer<typeof cambiarPasswordSchema>;