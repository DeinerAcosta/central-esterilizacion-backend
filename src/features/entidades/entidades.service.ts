import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EntidadInput {
  nombre: string;
  nit?: string;
  responsable?: string;
  ciudad?: string;
  contacto?: string;
  correo?: string;
}

/**
 * Tabla maestra Entidad — gestión de entidades externas (Configuración →
 * Entidad). El código se genera automáticamente con prefijo "ENT-" + número
 * correlativo.
 */
export class EntidadesService {
  static async listar(search?: string, ciudad?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (ciudad) where.ciudad = ciudad;
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { nit: { contains: search } },
        { responsable: { contains: search } },
        { ciudad: { contains: search } },
        { contacto: { contains: search } },
        { correo: { contains: search } },
      ];
    }
    return prisma.entidad.findMany({ where, orderBy: { id: 'desc' } });
  }

  /** Ciudades distintas para alimentar el filtro del frontend. */
  static async ciudades() {
    const rows = await prisma.entidad.findMany({
      where: { ciudad: { not: null } },
      select: { ciudad: true },
      distinct: ['ciudad'],
      orderBy: { ciudad: 'asc' },
    });
    return rows.map((r) => r.ciudad).filter((c): c is string => !!c);
  }

  static async crear(data: EntidadInput) {
    // Regla de negocio: el NIT de la entidad debe ser único.
    if (data.nit) {
      const dup = await prisma.entidad.findFirst({ where: { nit: data.nit } });
      if (dup) throw new Error("NIT_DUPLICADO");
    }
    const count = await prisma.entidad.count();
    const codigo = `ENT-${String(count + 1).padStart(3, '0')}`;
    return prisma.entidad.create({ data: { codigo, ...data } });
  }

  static async actualizar(id: number, data: EntidadInput) {
    if (data.nit) {
      const dup = await prisma.entidad.findFirst({ where: { nit: data.nit, id: { not: id } } });
      if (dup) throw new Error("NIT_DUPLICADO");
    }
    return prisma.entidad.update({ where: { id }, data });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return prisma.entidad.update({ where: { id }, data: { estado } });
  }
}
