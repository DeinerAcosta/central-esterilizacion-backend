import { z } from 'zod';

export const cicloIdSchema = z.object({
  cicloId: z.coerce.number({ message: "ID de ciclo inválido" }).min(1, "El ID de ciclo debe ser mayor a 0")
});

export const aprobarAsignacionSchema = z.object({
  instrumentos: z.array(z.object({
    id: z.coerce.number().min(1),
    estado: z.string().min(1)
  })).min(1, "Debe enviar al menos un instrumento para aprobar")
});