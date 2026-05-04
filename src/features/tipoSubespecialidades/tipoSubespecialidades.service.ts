import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TipoSubespecialidadesService {
  static async obtenerListasSoporte() {
    return await prisma.especialidad.findMany({
      where: { estado: true },
      include: { subespecialidades: { where: { estado: true } } }
    });
  }

  static async obtenerTodos(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { nombre: { contains: search } };
    
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, registros] = await Promise.all([
      prisma.tipoSubespecialidad.count({ where: whereClause }),
      prisma.tipoSubespecialidad.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { 
          subespecialidad: { 
            include: { especialidad: true } 
          } 
        },
        orderBy: [{ estado: 'desc' }, { id: 'desc' }]
      })
    ]);

    return { total, registros };
  }

  static async crear(nombre: string, subespecialidadId: number) {
    const last = await prisma.tipoSubespecialidad.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = last ? last.id + 1 : 1;
    const codigoGenerado = `TSUB-${String(nextNum).padStart(3, '0')}`;
    
    return await prisma.tipoSubespecialidad.create({
      data: { codigo: codigoGenerado, nombre, subespecialidadId }
    });
  }

  static async actualizar(id: number, nombre: string, subespecialidadId: number) {
    return await prisma.tipoSubespecialidad.update({
      where: { id },
      data: { nombre, subespecialidadId }
    });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return await prisma.tipoSubespecialidad.update({
      where: { id },
      data: { estado }
    });
  }
}