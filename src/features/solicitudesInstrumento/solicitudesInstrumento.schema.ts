import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number({ message: 'ID inválido' }).int().positive('El ID debe ser mayor a 0'),
});

export const listarQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  estado: z.enum(['Pendiente', 'Aprobado', 'Rechazado']).optional(),
});

export const crearSolicitudSchema = z.object({
  nombre: z.string().min(2, 'El nombre del instrumento es obligatorio'),
  especialidadId: z.coerce.number().int().positive('La especialidad es obligatoria'),
  subespecialidadId: z.coerce.number().int().positive('La subespecialidad es obligatoria'),
  solicitadoPorId: z.coerce.number().int().positive('El usuario solicitante es obligatorio'),
});

export type CrearSolicitudInput = z.infer<typeof crearSolicitudSchema>;
