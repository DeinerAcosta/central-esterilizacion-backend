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

  static async ejecutarTraslado(data: any) {
    if (data.sedeOrigenId === data.sedeDestinoId) {
        throw new Error("MISMA_SEDE");
    }

    if (data.tipoTraslado === 'kit') {
      const idsKits = data.items.map(Number);
      await prisma.kit.updateMany({
        where: { id: { in: idsKits }, sedeId: data.sedeOrigenId },
        data: { sedeId: data.sedeDestinoId }
      });
      await prisma.hojaVidaInstrumento.updateMany({
        where: { kitId: { in: idsKits } },
        data: { sedeId: data.sedeDestinoId }
      });
    } else {
      const idsInst = data.items.map((item: any) => Number(item.id));
      await prisma.hojaVidaInstrumento.updateMany({
        where: { id: { in: idsInst }, sedeId: data.sedeOrigenId },
        data: { sedeId: data.sedeDestinoId }
      });
    }
  }
}