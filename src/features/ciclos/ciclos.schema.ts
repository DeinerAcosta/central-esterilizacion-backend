import { z } from 'zod';

export const kitIdParamSchema = z.object({
  kitId: z.coerce.number({ message: "ID de kit inválido" }).min(1)
});

export const cicloIdParamSchema = z.object({
  cicloId: z.coerce.number({ message: "ID de ciclo inválido" }).min(1)
});

export const avanzarEtapaSchema = z.object({
  cicloId: z.coerce.number().min(1, "ID de ciclo requerido"),
  responsableId: z.coerce.number().min(1, "Responsable requerido"),
  nuevaEtapa: z.coerce.number().min(0, "Nueva etapa requerida"),
  tipoSellado: z.string().optional()
});

export const escanearInstrumentoSchema = z.object({
  cicloId: z.coerce.number().optional().nullable(),
  codigoInstrumento: z.string().min(1, "Código de instrumento requerido"),
  etapa: z.coerce.number().min(0, "Etapa requerida"),
  estadoFisico: z.string().min(1, "Estado físico requerido"),
  responsableId: z.coerce.number().optional().nullable()
});

export const finalizarCicloSchema = z.object({
  tipoEsterilizacion: z.string().optional().nullable(),
  autoclaveTipo: z.string().optional().nullable(),
  destinoSet: z.string().optional().nullable(),
  sedeDestino: z.coerce.number().optional().nullable(),
  quirofanoDestino: z.string().optional().nullable(),
  instrumentadorDestino: z.string().optional().nullable(),
  tipoEmpaque: z.string().optional().nullable(),
  cintaTest: z.string().optional().nullable(), // Viene como string 'true' o 'false'
  quimicoInterno: z.string().optional().nullable(),
  lote: z.string().optional().nullable(),
  valorIndicador: z.string().optional().nullable(),
  almacEstado: z.string().optional().nullable(),
  almacFechaIngreso: z.string().optional().nullable(),
  almacFechaVencimiento: z.string().optional().nullable(),
  almacUbicacion: z.string().optional().nullable(),
  almacObservacion: z.string().optional().nullable()
});