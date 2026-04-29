import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EspecialidadesService {
  static async obtenerTodas(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { nombre: { contains: search } };
    
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, especialidades] = await Promise.all([
      prisma.especialidad.count({ where: whereClause }),
      prisma.especialidad.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [ { estado: 'desc' }, { id: 'desc' } ] 
      })
    ]);

    return { total, especialidades };
  }

  static async crear(nombre: string) {
    const last = await prisma.especialidad.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = last ? last.id + 1 : 1;
    const codigoGenerado = `ESP-${String(nextNum).padStart(3, '0')}`;
    
    return await prisma.especialidad.create({
      data: { codigo: codigoGenerado, nombre }
    });
  }

  static async actualizar(id: number, nombre: string) {
    return await prisma.especialidad.update({
      where: { id },
      data: { nombre }
    });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return await prisma.especialidad.update({
      where: { id },
      data: { estado }
    });
  }
}