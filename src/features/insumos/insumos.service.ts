import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InsumosService {
  static async obtenerListasSoporte() {
    const [unidades, presentaciones, proveedores] = await Promise.all([
      prisma.unidadMedida.findMany({ where: { estado: true } }),
      prisma.presentacion.findMany({ where: { estado: true } }),
      prisma.proveedor.findMany({ where: { estado: true } })
    ]);
    return { unidades, presentaciones, proveedores };
  }

  static async obtenerTodos(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = { nombre: { contains: search } };
    
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, insumos] = await Promise.all([
      prisma.insumoQuirurgico.count({ where: whereClause }),
      prisma.insumoQuirurgico.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          unidadMedida: { select: { nombre: true } },
          presentacion: { select: { nombre: true } }
          // proveedor: { select: { nombre: true } } <-- COMENTADO HASTA QUE EXISTA EN DB
        },
        orderBy: [ { estado: 'desc' }, { id: 'desc' } ]
      })
    ]);

    return { total, insumos };
  }

  static async crear(data: any) {
    let codigoAsignado = data.codigo;
    
    // Regla de negocio: Generar código si viene vacío
    if (!codigoAsignado || codigoAsignado.trim() === '') {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const count = await prisma.insumoQuirurgico.count();
      codigoAsignado = `INS-${count + 1}-${randomPart}`;
    }

    return await prisma.insumoQuirurgico.create({
      data: {
        codigo: codigoAsignado,
        nombre: data.nombre,
        descripcion: data.descripcion,
        unidadMedidaId: data.unidadMedidaId,
        presentacionId: data.presentacionId,
        requiereEsterilizacion: data.requiereEsterilizacion,
        tipoEsterilizacion: data.tipoEsterilizacion || null
      }
    });
  }

  static async actualizar(id: number, data: any) {
    return await prisma.insumoQuirurgico.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        unidadMedidaId: data.unidadMedidaId,
        presentacionId: data.presentacionId,
        requiereEsterilizacion: data.requiereEsterilizacion,
        tipoEsterilizacion: data.tipoEsterilizacion || null
      }
    });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return await prisma.insumoQuirurgico.update({
      where: { id },
      data: { estado }
    });
  }
}