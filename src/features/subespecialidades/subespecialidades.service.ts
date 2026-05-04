import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SubespecialidadesService {
  static async obtenerListasSoporte() {
    return await prisma.especialidad.findMany({ where: { estado: true } });
  }

  static async obtenerTodas(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { nombre: { contains: search } };
    
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, subespecialidades] = await Promise.all([
      prisma.subespecialidad.count({ where: whereClause }),
      prisma.subespecialidad.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { especialidad: true },
        orderBy: [ { estado: 'desc' }, { id: 'desc' } ]
      })
    ]);

    return { total, subespecialidades };
  }

  static async crear(nombre: string, especialidadId: number) {
    // 1. Verificar duplicidad
    const existe = await prisma.subespecialidad.findFirst({
      where: { nombre, especialidadId }
    });
    if (existe) throw new Error("DUPLICADO");

    // 2. Generar Código
    const last = await prisma.subespecialidad.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = last ? last.id + 1 : 1;
    const codigoGenerado = `SUB-${String(nextNum).padStart(3, '0')}`;

    // 3. Guardar
    return await prisma.subespecialidad.create({
      data: { codigo: codigoGenerado, nombre, especialidadId }
    });
  }

  static async actualizar(id: number, nombre: string, especialidadId: number) {
    // Verificar duplicidad excluyendo la subespecialidad actual
    const existe = await prisma.subespecialidad.findFirst({
      where: { nombre, especialidadId, id: { not: id } }
    });
    if (existe) throw new Error("DUPLICADO");

    return await prisma.subespecialidad.update({
      where: { id },
      data: { nombre, especialidadId }
    });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return await prisma.subespecialidad.update({
      where: { id },
      data: { estado }
    });
  }

  static async obtenerConKits() {
    return await prisma.subespecialidad.findMany({
      where: { estado: true },
      include: {
        kits: {
          where: { estado: 'Activo' } 
        }
      }
    });
  }
}