import { z } from 'zod';

// ─── Enviar set a quirófano ───────────────────────────────────
export const enviarSetSchema = z.object({
  kitId:            z.coerce.number({ message: 'El ID del elemento es requerido' }).min(1),
  quirofanoId:      z.coerce.number({ message: 'El quirófano es requerido' }).min(1),
  estado:           z.string({ message: 'El estado es requerido' }).min(1),
  instrumentadorId: z.coerce.number().optional().nullable(),
  responsableId:    z.coerce.number({ message: 'El responsable es requerido' }).min(1),
});

// ─── Item de insumo en un movimiento ─────────────────────────
const insumoItemSchema = z.object({
  insumoId: z.coerce.number({ message: 'El ID del insumo es requerido' }).min(1),
  cantidad: z.coerce.number({ message: 'La cantidad es requerida' }).min(1, 'La cantidad debe ser mayor a 0'),
});

// ─── Registrar solicitud o consumo de insumos ────────────────
export const movimientoInsumoSchema = z.object({
  fecha:         z.string({ message: 'La fecha es requerida' }).min(1, 'La fecha no puede estar vacía'),
  responsableId: z.coerce.number({ message: 'El responsable es requerido' }).min(1),
  sedeId:        z.coerce.number({ message: 'La sede es requerida' }).min(1),
  insumos:       z.array(insumoItemSchema).min(1, 'Debe seleccionar al menos un insumo'),
  solicitudAnteriorId: z.coerce.number().optional().nullable(),
});

export type EnviarSetInput        = z.infer<typeof enviarSetSchema>;
export type MovimientoInsumoInput = z.infer<typeof movimientoInsumoSchema>;