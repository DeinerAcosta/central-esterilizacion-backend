import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const passwordMsg = "La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número.";

export const createUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().min(1, "El apellido es requerido"),
  empresa: z.string().min(1, "La empresa es requerida"),
  cargo: z.string().min(1, "El cargo es requerido"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().regex(passwordRegex, passwordMsg),
  rol: z.string().optional(),
  esPropietario: z.coerce.boolean().optional(),
  registroContable: z.coerce.boolean().optional(),
  estado: z.coerce.boolean().optional(),
  permisos: z.any().optional()
});

export const updateUsuarioSchema = createUsuarioSchema.partial().extend({
  password: z.string().regex(passwordRegex, passwordMsg).optional().or(z.literal(''))
});

export const toggleEstadoSchema = z.object({
  estado: z.boolean({ message: "El estado es requerido" })
});

export const validarPinSchema = z.object({
  pin: z.string().min(4, "El PIN debe tener al menos 4 dígitos")
});