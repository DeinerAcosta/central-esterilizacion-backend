import { z } from 'zod';

export const createHojaVidaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  especialidadId: z.coerce.number().min(1),
  subespecialidadId: z.coerce.number().min(1),
  tipoId: z.coerce.number().optional().nullable(),
  proveedorId: z.coerce.number().min(1),
  fabricante: z.string().optional().nullable(),
  marcaId: z.coerce.number().optional().nullable(),
  referencia: z.string().optional().nullable(),
  paisOrigen: z.string().optional().nullable(),
  numeroSerie: z.string().min(1, "Número de serie requerido"),
  registroInvima: z.string().min(1, "Registro INVIMA requerido"),
  material: z.string().min(1, "Material requerido"),
  materialOtro: z.string().optional().nullable(),
  esterilizacion: z.string().min(1, "Tipo de esterilización requerida"),
  frecuenciaMantenimiento: z.string().min(1, "Frecuencia requerida"),
  observacionesTecnico: z.string().optional().nullable(),
  propietarioId: z.coerce.number().min(1),
  notasObservaciones: z.string().optional().nullable()
});

export const registrarContableSchema = z.object({
  fechaCompra: z.string().min(1),
  costoAdquisicion: z.coerce.number().min(0),
  iva: z.coerce.number().optional().nullable(),
  numeroFactura: z.string().min(1),
  vidaUtil: z.coerce.number().optional().nullable()
});

export const patchEstadoSchema = z.object({
  estado: z.string().min(1, "Estado requerido")
});

export const ejecutarTrasladoSchema = z.object({
  sedeOrigenId: z.coerce.number().min(1),
  sedeDestinoId: z.coerce.number().min(1),
  tipoTraslado: z.string().min(1),
  items: z.array(z.any()).min(1, "Debe seleccionar al menos un ítem")
});