import { z } from 'zod';

export const createReporteSchema = z.object({
  instrumentoId: z.coerce.number({ message: "El ID del instrumento es requerido" }).min(1),
  tipoDano: z.string({ message: "El tipo de daño es requerido" }).min(1, "El tipo de daño no puede estar vacío"),
  descripcionDano: z.string().optional().nullable(),
  codigoVerificacion: z.string({ message: "El PIN de verificación es requerido" }).min(1, "El PIN no puede estar vacío")
});

export const gestionarReporteSchema = z.object({
  proveedorMantenimientoId: z.coerce.number({ message: "Falta proveedor" }).min(1, "Proveedor inválido"),
  descripcionMantenimiento: z.string({ message: "Falta descripción" }).min(1, "La descripción no puede estar vacía")
});

export const finalizarReporteSchema = z.object({
  destinoFinal: z.string({ message: "Falta destino final" }).min(1, "Debe seleccionar un destino final")
});

export const validarPinSchema = z.object({
  pin: z.string().min(1, "PIN es requerido")
});