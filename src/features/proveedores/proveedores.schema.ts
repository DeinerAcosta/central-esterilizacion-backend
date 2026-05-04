import { z } from 'zod';

export const proveedorSchema = z.object({
  codigo: z.string().optional().nullable(),
  tipo: z.string({ message: "El tipo es requerido" }).min(1, "El tipo no puede estar vacío"),
  nombre: z.string({ message: "El nombre es requerido" }).min(1, "El nombre no puede estar vacío"),
  nit: z.string({ message: "El NIT es requerido" })
       .min(1, "El NIT no puede estar vacío")
       .regex(/^\d+$/, "El NIT solo debe contener números"),
  pais: z.string({ message: "El país es requerido" }).min(1, "El país no puede estar vacío"),
  ciudad: z.string({ message: "La ciudad es requerida" }).min(1, "La ciudad no puede estar vacía")
});

export const toggleEstadoSchema = z.object({
  estado: z.boolean({ message: "El estado es requerido y debe ser un valor booleano" })
});