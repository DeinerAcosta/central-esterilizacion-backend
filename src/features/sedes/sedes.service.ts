import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SedesService {
  static async obtenerTodas(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { nombre: { contains: search } };
    
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, sedes] = await Promise.all([
      prisma.sede.count({ where: whereClause }),
      prisma.sede.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ estado: 'desc' }, { nombre: 'asc' }]
      })
    ]);

    return { total, sedes };
  }

  static async crear(data: any) {
    return await prisma.sede.create({
      data: {
        nombre: data.nombre,
        pais: data.pais,
        ciudad: data.ciudad,
        direccion: data.direccion,
        responsable: data.responsable
      }
    });
  }

  static async actualizar(id: number, data: any) {
    return await prisma.sede.update({
      where: { id },
      data: {
        nombre: data.nombre,
        pais: data.pais,
        ciudad: data.ciudad,
        direccion: data.direccion,
        responsable: data.responsable
      }
    });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return await prisma.sede.update({
      where: { id },
      data: { estado }
    });
  }
}