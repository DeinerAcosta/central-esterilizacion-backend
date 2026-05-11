import { z } from 'zod';

export const insumoItemSchema = z.object({
  id:       z.coerce.number().min(1, "ID de insumo inválido"),
  cantidad: z.coerce.number().min(1, "La cantidad debe ser mayor a 0")
});

export const registrarInsumosSchema = z.object({
  pinResponsable: z.string({ message: "El PIN es requerido" }).min(1, "El PIN no puede estar vacío"),
  insumosAgregados: z.string().transform((str, ctx) => {
    try {
      const parsed = JSON.parse(str);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Agregue al menos un insumo." });
        return z.NEVER;
      }
      return parsed;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Formato de insumos inválido." });
      return z.NEVER;
    }
  }),
  // ✅ NUEVO: campos de sellado e indicador ahora validados
  tipoSellado:    z.string({ message: "El tipo de sellado es requerido" }).min(1, "El tipo de sellado no puede estar vacío"),
  valorIndicador: z.string({ message: "El valor del indicador es requerido" }).min(1, "El valor del indicador no puede estar vacío"),
  // Campos opcionales de almacenamiento
  destinoSet:              z.string().optional().default('Almacenamiento (Stock)'),
  almacEstado:             z.string().optional().default('Habilitado'),
  almacFechaIngreso:       z.string().optional(),
  almacFechaVencimiento:   z.string().optional().default(''),
  almacUbicacion:          z.string().optional().default(''),
  almacObservacion:        z.string().optional().default(''),
});

export type RegistrarInsumosInput = z.infer<typeof registrarInsumosSchema>;