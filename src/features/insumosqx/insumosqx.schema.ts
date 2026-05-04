import { z } from 'zod';

export const insumoItemSchema = z.object({
  id: z.coerce.number().min(1, "ID de insumo inválido"),
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
      return parsed; // Devolvemos el array ya parseado
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Formato de insumos inválido." });
      return z.NEVER;
    }
  })
});