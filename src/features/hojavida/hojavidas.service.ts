import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class HojaVidasService {
  static async obtenerTodas(page: number, limit: number, search: string, params: any) {
    const skip = (page - 1) * limit;
    const whereClause: any = {
      OR: [
        { codigo: { contains: search } },
        { numeroSerie: { contains: search } },
        { fabricante: { contains: search } },
        { nombre: { contains: search } },
        { referencia: { contains: search } }
      ]
    };

    if (params.estado) whereClause.estado = String(params.estado);
    if (params.especialidadId) whereClause.especialidadId = Number(params.especialidadId);
    if (params.subespecialidadId) whereClause.subespecialidadId = Number(params.subespecialidadId);

    const [total, hojas] = await Promise.all([
      prisma.hojaVidaInstrumento.count({ where: whereClause }),
      prisma.hojaVidaInstrumento.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          especialidad: true, subespecialidad: true, tipo: true,
          proveedor: true, marca: true, kit: true, sede: true,
          propietario: { select: { nombre: true, apellido: true } }
        },
        orderBy: { estado: 'desc' }
      })
    ]);

    return { total, hojas };
  }

  static async crear(data: any, filesUrls: any) {
    const esp = await prisma.especialidad.findUnique({ where: { id: data.especialidadId } });
    const sub = await prisma.subespecialidad.findUnique({ where: { id: data.subespecialidadId } });
    const tipo = data.tipoId ? await prisma.tipoSubespecialidad.findUnique({ where: { id: data.tipoId } }) : null;

    if (!esp || !sub) throw new Error("ESPECIALIDAD_INVALIDA");

    const pEsp = esp.nombre.substring(0, 2).toUpperCase();
    const pSub = sub.nombre.substring(0, 2).toUpperCase();
    const pTip = tipo ? tipo.nombre.substring(0, 2).toUpperCase() : '--';
    const prefijo = `${pEsp}${pSub}${pTip}`;
    
    const count = await prisma.hojaVidaInstrumento.count();
    const codigoGenerado = `${prefijo}-${String(count + 1).padStart(3, '0')}`; 

    return await prisma.hojaVidaInstrumento.create({
      data: {
        ...data,
        codigo: codigoGenerado,
        tipoId: data.tipoId || 0,
        materialOtro: data.material === 'Otros' ? data.materialOtro : null,
        estadoActual: "P. registrar",
        cicloEsterilizacion: 0,
        estado: "P. registrar", 
        ...filesUrls
      }
    });
  }

  static async actualizar(id: number, data: any, filesUrls: any) {
    const updateData = {
        ...data,
        materialOtro: data.material === 'Otros' ? data.materialOtro : null,
        ...filesUrls
    };

    return await prisma.hojaVidaInstrumento.update({
      where: { id },
      data: updateData
    });
  }

  static async registrarContable(id: number, data: any, facturaUrl: string | null) {
    return await prisma.hojaVidaInstrumento.update({
      where: { id },
      data: {
        fechaCompra: new Date(data.fechaCompra),
        costo: data.costoAdquisicion,
        iva: data.iva || null,
        numeroFactura: data.numeroFactura,
        vidaUtil: data.vidaUtil || null,
        facturaUrl,
        estado: "Habilitado",       
        estadoActual: "Habilitado"
      }
    });
  }

  static async cambiarEstado(id: number, estado: string) {
    const inst = await prisma.hojaVidaInstrumento.findUnique({ where: { id }});
    if (!inst) throw new Error("NO_ENCONTRADO");

    return await prisma.hojaVidaInstrumento.update({
      where: { id },
      data: { estado, estadoActual: estado }
    });
  }

  static async buscarPorCodigo(codigo: string) {
    return await prisma.hojaVidaInstrumento.findUnique({
      where: { codigo: codigo.trim() },
      include: { kit: true, especialidad: true, subespecialidad: true }
    });
  }

  static async obtenerInventario(params: any) {
    const { especialidadId, subespecialidadId, tipoId, search } = params;
    const instrumentos = await prisma.hojaVidaInstrumento.findMany({
      where: {
        estado: { in: ["Habilitado", "Deshabilitado", "En mantenimiento"] },
        especialidadId: especialidadId ? Number(especialidadId) : undefined,
        subespecialidadId: subespecialidadId ? Number(subespecialidadId) : undefined,
        tipoId: tipoId ? Number(tipoId) : undefined,
        OR: search ? [{ nombre: { contains: String(search) } }, { kit: { codigoKit: { contains: String(search) } } }] : undefined
      },
      include: { especialidad: true, subespecialidad: true, tipo: true, kit: true }
    });

    const agrupado: Record<string, any> = {};
    instrumentos.forEach(inst => {
      const key = `${inst.especialidadId}-${inst.subespecialidadId}-${inst.tipoId}`;
      if (!agrupado[key]) {
        agrupado[key] = { id: key, esp: inst.especialidad?.nombre, sub: inst.subespecialidad?.nombre, tipo: inst.tipo?.nombre, cant: 0, kitsUnicos: {} };
      }
      
      if (inst.kit?.id) {
        agrupado[key].kitsUnicos[inst.kit.id] = { 
          id: inst.kit.id, 
          codigoKit: inst.kit.codigoKit, 
          estado: inst.kit.estado, 
          cantidad: (inst.kit as any).cantidad || 1 
        };
      }
    });

    return Object.values(agrupado).map((item: any) => {
      const lista = Object.values(item.kitsUnicos) as any[];
      const totalKitsDisponibles = lista.reduce((acc, cur) => acc + (cur.cantidad || 0), 0);
      return { ...item, cant: totalKitsDisponibles, kits: lista };
    });
  }

  static async obtenerBajas(page: number, limit: number, search: string, params: any) {
    const skip = (page - 1) * limit;
    const whereClause: any = { estado: "De baja" };
    
    if (params.especialidadId) whereClause.especialidadId = Number(params.especialidadId);
    if (params.subespecialidadId) whereClause.subespecialidadId = Number(params.subespecialidadId);
    if (search) {
      whereClause.OR = [
        { nombre: { contains: String(search) } },
        { codigo: { contains: String(search) } }
      ];
    }
    if (params.fechaDesde && params.fechaHasta) {
      whereClause.updatedAt = {
        gte: new Date(`${params.fechaDesde}T00:00:00.000Z`),
        lte: new Date(`${params.fechaHasta}T23:59:59.999Z`)
      };
    }

    const [total, bajas] = await Promise.all([
      prisma.hojaVidaInstrumento.count({ where: whereClause }),
      prisma.hojaVidaInstrumento.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { especialidad: true, subespecialidad: true, kit: true },
        orderBy: { updatedAt: 'desc' } 
      })
    ]);

    return { total, bajas };
  }
}