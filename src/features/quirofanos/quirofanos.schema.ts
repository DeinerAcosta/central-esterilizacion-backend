import { z } from 'zod';

const nombreQuirofanoRegex = /^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ.\-]+$/;

export const quirofanoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string({ message: "El nombre es requerido" })
    .min(1, "El nombre no puede estar vacío")
    .regex(nombreQuirofanoRegex, "El nombre del quirófano contiene caracteres inválidos (solo letras y números permitidos)."),
  sedeId: z.coerce.number({ message: "La sede es requerida" }).min(1)
});

export const toggleEstadoSchema = z.object({
  estado: z.boolean({ message: "El estado es requerido y debe ser un valor booleano (true/false)" })
});