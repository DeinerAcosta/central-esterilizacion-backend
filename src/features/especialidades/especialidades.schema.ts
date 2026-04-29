import { z } from 'zod';

// Regex que enviaste: Solo letras, espacios y acentos
const nombreRegex = /^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ]+$/;

export const especialidadSchema = z.object({
  nombre: z.string({ message: "El nombre es requerido y debe ser texto" })
    .min(1, "El nombre no puede estar vacío")
    .regex(nombreRegex, "El nombre solo debe contener letras")
});

export const toggleEstadoSchema = z.object({
  estado: z.boolean({ message: "El estado es requerido y debe ser un valor booleano (true/false)" })
});