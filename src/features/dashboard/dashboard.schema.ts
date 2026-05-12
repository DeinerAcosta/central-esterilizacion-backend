import { z } from 'zod';

// Dashboard solo tiene endpoints GET con query params opcionales
// No tiene mutaciones, pero el schema valida los filtros de consulta

export const dashboardQuerySchema = z.object({
  year: z.coerce.number()
    .min(2020, 'El año debe ser mayor a 2020')
    .max(2100, 'El año debe ser menor a 2100')
    .optional(),
  period: z.enum(['Mes', 'Año', 'Todos']).optional(),
  sedeId: z.coerce.number().positive().optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;