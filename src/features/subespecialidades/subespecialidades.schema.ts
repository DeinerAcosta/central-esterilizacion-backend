import { z } from 'zod';

const nombreRegex = /^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ]+$/;

export const subespecialidadSchema = z.object({
  nombre: z.string({ message: "El nombre es requerido y debe ser texto" })
    .min(1, "El nombre no puede estar vacío")
    .regex(nombreRegex, "El nombre solo debe contener letras"),
  especialidadId: z.coerce.number({ message: "La especialidad es requerida" })
    .min(1, "ID de especialidad inválido")
});

export const toggleEstadoSchema = z.object({
  estado: z.boolean({ message: "El estado es requerido y debe ser un valor booleano (true/false)" })
});