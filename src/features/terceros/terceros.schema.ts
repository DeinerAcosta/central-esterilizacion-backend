import { z } from 'zod';

// ─── Params ─────────────────────────────────────────────
export const idParamSchema = z.object({
  id: z.coerce.number({ message: 'ID inválido' }).int().positive('El ID debe ser mayor a 0'),
});

// ─── Filtros de listados ────────────────────────────────
export const ingresosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100000).default(10),
  idRecepcion: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

export const devolucionesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100000).default(10),
  idRecepcion: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

export const instrumentosDisponiblesQuerySchema = z.object({
  search: z.string().optional(),
  especialidadId: z.coerce.number().int().positive().optional(),
  subespecialidadId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Crear Entidad ──────────────────────────────────────
export const crearEntidadSchema = z.object({
  nombre: z.string().min(2, 'El nombre es obligatorio'),
  nit: z.string().optional(),
  contacto: z.string().optional(),
});

// ─── Crear Ingreso ──────────────────────────────────────
// Se valida el campo `datos` deserializado del FormData (igual que en trazabilidad)
export const instrumentoIngresoSchema = z.object({
  instrumentoId: z.number().int().positive().optional(),
  codigoExterno: z.string().optional(),
  nombreExterno: z.string().optional(),
  esRegistrado: z.boolean(),
  cantidad: z.number().int().positive(),
});

export const crearIngresoSchema = z.object({
  idRecepcion: z.string().min(1, 'El ID de recepción es obligatorio'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  hora: z.string().min(1, 'La hora es obligatoria'),
  entidadId: z.coerce.number().int().positive('La entidad es obligatoria'),
  instrumentos: z.array(instrumentoIngresoSchema).min(1, 'Debe agregar al menos un instrumento'),
});

// ─── Crear Devolución ───────────────────────────────────
export const crearDevolucionSchema = z.object({
  fechaSalida: z.string().min(1, 'La fecha de salida es obligatoria'),
  hora: z.string().min(1, 'La hora es obligatoria'),
  responsableId: z.coerce.number().int().positive().optional(),
  detalles: z
    .array(
      z.object({
        instrumentoTerceroId: z.number().int().positive(),
        cantidadDevuelta: z.number().int().positive(),
      }),
    )
    .min(1, 'Debe seleccionar al menos un instrumento para devolver'),
});

export type CrearIngresoInput = z.infer<typeof crearIngresoSchema>;
export type CrearDevolucionInput = z.infer<typeof crearDevolucionSchema>;
