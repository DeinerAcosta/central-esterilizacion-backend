import { z } from 'zod';

export const marcaSchema = z.object({
  nombre: z.string({ message: "El nombre es requerido y debe ser texto" })
    .min(1, "El nombre no puede estar vacío"),
  estado: z.boolean().optional()
});

export const toggleEstadoSchema = z.object({
  estado: z.boolean({ message: "El estado es requerido y debe ser un valor booleano (true/false)" })
});