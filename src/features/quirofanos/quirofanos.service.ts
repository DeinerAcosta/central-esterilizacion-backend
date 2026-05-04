import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class QuirofanosService {
  static async obtenerListasSoporte() {
    return await prisma.sede.findMany({ where: { estado: true } });
  }

  static async obtenerTodos(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { nombre: { contains: search } };
    
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, quirofanos] = await Promise.all([
      prisma.quirofano.count({ where: whereClause }),
      prisma.quirofano.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { sede: true },
        orderBy: [{ estado: 'desc' }, { id: 'desc' }]
      })
    ]);

    return { total, quirofanos };
  }

  static async crear(data: any) {
    // 1. Verificamos duplicidad
    const existe = await prisma.quirofano.findFirst({
      where: { nombre: data.nombre, sedeId: data.sedeId }
    });
    
    if (existe) {
      throw new Error("DUPLICADO");
    }

    // 2. Generamos código si viene vacío
    let codigoAsignado = data.codigo;
    if (!codigoAsignado || codigoAsignado.trim() === '') {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const count = await prisma.quirofano.count();
      codigoAsignado = `QUIRO-${count + 1}-${randomPart}`;
    }

    // 3. Guardamos
    return await prisma.quirofano.create({
      data: {
        codigo: codigoAsignado,
        nombre: data.nombre,
        sedeId: data.sedeId
      }
    });
  }

  static async actualizar(id: number, data: any) {
    return await prisma.quirofano.update({
      where: { id },
      data: {
        ...(data.codigo && { codigo: data.codigo }),
        nombre: data.nombre,
        sedeId: data.sedeId
      }
    });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return await prisma.quirofano.update({
      where: { id },
      data: { estado }
    });
  }
}