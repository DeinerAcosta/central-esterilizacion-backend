import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number({ message: 'ID inválido' }).int().positive('El ID debe ser mayor a 0'),
});

export const trasladosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});
