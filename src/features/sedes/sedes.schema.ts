import { z } from 'zod';

// Solo letras, números, espacios, acentos, puntos y guiones
const nombreSedeRegex = /^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ.\-]+$/;

const campoObligatorioMsg = "Por favor complete todos los campos obligatorios.";

export const sedeSchema = z.object({
  nombre: z.string({ message: campoObligatorioMsg })
    .min(1, campoObligatorioMsg)
    .regex(nombreSedeRegex, "El nombre de la sede contiene caracteres inválidos (solo letras y números permitidos)."),
  pais: z.string({ message: campoObligatorioMsg }).min(1, campoObligatorioMsg),
  ciudad: z.string({ message: campoObligatorioMsg }).min(1, campoObligatorioMsg),
  direccion: z.string({ message: campoObligatorioMsg }).min(1, campoObligatorioMsg),
  responsable: z.string({ message: campoObligatorioMsg }).min(1, campoObligatorioMsg)
});

export const toggleEstadoSchema = z.object({
  estado: z.boolean({ message: "El estado es requerido y debe ser un valor booleano (true/false)" })
});