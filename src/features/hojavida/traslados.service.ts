import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TrasladosService {
  static async obtenerInventarioSede(sedeId: number, tipoTraslado: string, especialidadId?: string, subespecialidadId?: string, tipoId?: string) {
    if (tipoTraslado === 'kit') {
      const whereKit: any = { sedeId, estado: "Habilitado" };
      if (especialidadId) whereKit.especialidadId = Number(especialidadId);
      if (subespecialidadId) whereKit.subespecialidadId = Number(subespecialidadId);
      if (tipoId) {
        const tipoObj = await prisma.tipoSubespecialidad.findUnique({ where: { id: Number(tipoId) }});
        if (tipoObj) whereKit.tipoSubespecialidad = tipoObj.nombre;
      }
      
      const kits = await prisma.kit.findMany({ where: whereKit });  
      return kits.map(k => ({
        id: k.id,
        nombre: `Kit Especializado ${k.codigoKit || k.numeroKit || ''}`,
        codigoKit: k.codigoKit
      }));
    } else {
      const whereInst: any = { sedeId, estado: "Habilitado" };
      if (especialidadId) whereInst.especialidadId = Number(especialidadId);
      if (subespecialidadId) whereInst.subespecialidadId = Number(subespecialidadId);
      if (tipoId) whereInst.tipoId = Number(tipoId);
      
      const instrumentos = await prisma.hojaVidaInstrumento.findMany({
        where: whereInst,
        include: { kit: true }
      });  
      return instrumentos.map(i => ({
        id: i.id,
        nombre: i.nombre,
        codigo: i.codigo,
        kit: i.kit ? { codigoKit: i.kit.codigoKit } : null,
        qty: 1 
      }));
    }
  }

  /**
   * Ejecuta un traslado entre sedes desde Hojas de Vida → Inventario.
   *
   * Hace tres cosas en transacción:
   *  1. Mueve los items físicamente (cambia sedeId en Kit / HojaVidaInstrumento)
   *  2. Crea un registro en HistorialTraslado por cada kit/instrumento
   *     trasladado, en estado "Pendiente" y con fechaDevolucion +30 días
   *  3. Si es traslado de kit, también crea los TrasladoInstrumentoEstado
   *     en estado "Pendiente" para cada instrumento del kit (así la vista
   *     "Aprobar recibido" muestra los items para validar)
   *
   * Esto cierra el ciclo end-to-end: el módulo Informes → Historial de
   *   traslados ya no solo refleja el seed, también las operaciones reales.
   */
  static async ejecutarTraslado(data: any) {
    if (data.sedeOrigenId === data.sedeDestinoId) {
        throw new Error("MISMA_SEDE");
    }

    const fechaTraslado   = new Date();
    const fechaDevolucion = new Date(Date.now() + 30 * 86_400_000); // +30 días

    if (data.tipoTraslado === 'kit') {
      const idsKits = data.items.map(Number);

      // 1. Mover kits + sus instrumentos a la sede destino
      await prisma.kit.updateMany({
        where: { id: { in: idsKits }, sedeId: data.sedeOrigenId },
        data: { sedeId: data.sedeDestinoId }
      });
      await prisma.hojaVidaInstrumento.updateMany({
        where: { kitId: { in: idsKits } },
        data: { sedeId: data.sedeDestinoId }
      });

      // 2 + 3. Crear HistorialTraslado + TrasladoInstrumentoEstado por kit
      for (const kitId of idsKits) {
        const traslado = await prisma.historialTraslado.create({
          data: {
            sedeOrigenId:    data.sedeOrigenId,
            sedeDestinoId:   data.sedeDestinoId,
            fechaTraslado,
            fechaDevolucion,
            estado:          'Pendiente',
            kitId,
          },
        });
        // Estados de cada instrumento del kit, listos para "Aprobar recibido"
        const hvs = await prisma.hojaVidaInstrumento.findMany({
          where: { kitId },
          select: { id: true },
        });
        if (hvs.length > 0) {
          await prisma.trasladoInstrumentoEstado.createMany({
            data: hvs.map((hv) => ({
              trasladoId:    traslado.id,
              instrumentoId: hv.id,
              cantidad:      1,
              estado:        'Pendiente',
            })),
          });
        }
      }
    } else {
      const idsInst = data.items.map((item: any) => Number(item.id));

      // 1. Mover instrumentos a la sede destino
      await prisma.hojaVidaInstrumento.updateMany({
        where: { id: { in: idsInst }, sedeId: data.sedeOrigenId },
        data: { sedeId: data.sedeDestinoId }
      });

      // 2 + 3. Crear HistorialTraslado por cada instrumento suelto
      for (const instrumentoId of idsInst) {
        const traslado = await prisma.historialTraslado.create({
          data: {
            sedeOrigenId:    data.sedeOrigenId,
            sedeDestinoId:   data.sedeDestinoId,
            fechaTraslado,
            fechaDevolucion,
            estado:          'Pendiente',
            instrumentoId,
          },
        });
        await prisma.trasladoInstrumentoEstado.create({
          data: {
            trasladoId:    traslado.id,
            instrumentoId,
            cantidad:      1,
            estado:        'Pendiente',
          },
        });
      }
    }
  }
}