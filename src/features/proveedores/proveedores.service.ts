import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProveedoresService {
  static async obtenerTodos(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = {
      OR: [
        { nombre: { contains: search } },
        { nit: { contains: search } }
      ]
    };
    
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, proveedores] = await Promise.all([
      prisma.proveedor.count({ where: whereClause }),
      prisma.proveedor.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [ { estado: 'desc' }, { id: 'desc' } ]
      })
    ]);

    return { total, proveedores };
  }

  static async crear(data: any) {
    let codigoAsignado = data.codigo;

    if (!codigoAsignado || String(codigoAsignado).trim() === '') {
      // Código consecutivo continuando el formato existente (PROV-01, PROV-02…).
      // Los proveedores usan toggle de estado (no se borran), por lo que el
      // conteo es estable y no genera choques. El campo codigo es @unique.
      const count = await prisma.proveedor.count();
      codigoAsignado = `PROV-${String(count + 1).padStart(2, '0')}`;
    }

    return await prisma.proveedor.create({
      data: {
        codigo: String(codigoAsignado),
        tipo: String(data.tipo),
        nombre: String(data.nombre),
        nit: String(data.nit),
        pais: String(data.pais),
        ciudad: String(data.ciudad)
      }
    });
  }

  static async actualizar(id: number, data: any) {
    return await prisma.proveedor.update({
      where: { id },
      data: {
        ...(data.codigo && { codigo: String(data.codigo) }),
        tipo: String(data.tipo),
        nombre: String(data.nombre),
        nit: String(data.nit),
        pais: String(data.pais),
        ciudad: String(data.ciudad)
      }
    });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return await prisma.proveedor.update({
      where: { id },
      data: { estado }
    });
  }
}