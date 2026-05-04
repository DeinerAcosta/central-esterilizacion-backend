import { z } from 'zod';

export const insumoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nombre: z.string({ message: "El nombre es requerido" }).min(1, "El nombre no puede estar vacío"),
  descripcion: z.string().optional().nullable(),
  // Usamos z.coerce.number() por si el front envía el ID como string ('1' en vez de 1)
  unidadMedidaId: z.coerce.number({ message: "La unidad de medida es requerida" }).min(1, "Unidad de medida inválida"),
  presentacionId: z.coerce.number({ message: "La presentación es requerida" }).min(1, "Presentación inválida"),
  requiereEsterilizacion: z.coerce.boolean({ message: "Indique si requiere esterilización" }),
  tipoEsterilizacion: z.string().optional().nullable()
});

export const toggleEstadoSchema = z.object({
  estado: z.boolean({ message: "El estado es requerido y debe ser un valor booleano" })
});