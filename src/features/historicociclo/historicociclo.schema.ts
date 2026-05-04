import { z } from 'zod';

export const getHistoricoPorKitSchema = z.object({
  kitId: z.coerce.number({ message: "ID de kit inválido" }).min(1, "ID de kit es requerido")
});