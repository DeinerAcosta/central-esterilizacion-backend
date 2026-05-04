import { z } from 'zod';

export const createKitSchema = z.object({
  especialidadId: z.coerce.number({ message: "La especialidad es requerida" }).min(1),
  subespecialidadId: z.coerce.number({ message: "La subespecialidad es requerida" }).min(1),
  tipoSubespecialidadId: z.union([z.string(), z.number()]).optional().nullable(),
  sedeId: z.coerce.number({ message: "La sede es requerida" }).min(1),
  instrumentosIds: z.array(z.coerce.number()).optional().default([])
});

export const updateKitSchema = z.object({
  sedeId: z.coerce.number().optional().nullable(),
  instrumentosIds: z.array(z.coerce.number()).optional().default([])
});

// A diferencia de otros módulos donde el estado es boolean, en Kit es string ('Habilitado', 'Deshabilitado', etc)
export const toggleEstadoSchema = z.object({
  estado: z.string({ message: "El estado es requerido" }).min(1, "El estado no puede estar vacío")
});