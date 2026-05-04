import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MarcasService {
  static async obtenerTodas(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = {
      OR: [
        { nombre: { contains: search } },
        { codigo: { contains: search } }
      ]
    };
    
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, marcas] = await Promise.all([
      prisma.marca.count({ where: whereClause }),
      prisma.marca.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ estado: 'desc' }, { id: 'desc' }]
      })
    ]);

    return { total, marcas };
  }

  static async crear(nombre: string, estado?: boolean) {
    // Es más seguro buscar el último ID que usar count() por si se borran registros
    const last = await prisma.marca.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = last ? last.id + 1 : 1;
    const codigo = `MAR-${String(nextNum).padStart(3, '0')}`;
    
    return await prisma.marca.create({
      data: {
        codigo,
        nombre: nombre.trim(),
        estado: estado !== undefined ? estado : true
      }
    });
  }

  static async actualizar(id: number, nombre: string) {
    return await prisma.marca.update({
      where: { id },
      data: { nombre: nombre.trim() }
    });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return await prisma.marca.update({
      where: { id },
      data: { estado }
    });
  }
}