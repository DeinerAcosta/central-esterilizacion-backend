import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class KitsService {
  static async obtenerTodos(
    page: number, limit: number, search: string, estadoFiltro?: string, 
    especialidadId?: string, subespecialidadId?: string, sedeId?: string
  ) {
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    
    if (estadoFiltro) whereClause.estado = estadoFiltro;
    if (especialidadId) whereClause.especialidadId = Number(especialidadId);
    if (subespecialidadId) whereClause.subespecialidadId = Number(subespecialidadId);
    if (sedeId) whereClause.sedeId = Number(sedeId);
    if (search) {
      whereClause.OR = [
        { codigoKit: { contains: search } },
        { nombre: { contains: search } }
      ];
    }

    const [total, kits] = await Promise.all([
      prisma.kit.count({ where: whereClause }),
      prisma.kit.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { 
          especialidad: true, 
          subespecialidad: true,
          sede: true, 
          hojasDeVida: true 
        },
        orderBy: { id: 'desc' }
      })
    ]);

    // Formatear datos para el frontend (Mapear hojasDeVida a instrumentos)
    const dataFormateada = kits.map(k => ({
        ...k,
        instrumentos: k.hojasDeVida
    }));

    return { total, kits: dataFormateada };
  }

  static async crear(data: any) {
    const { especialidadId, subespecialidadId, tipoSubespecialidadId, sedeId, instrumentosIds } = data;
    
    const esp = await prisma.especialidad.findUnique({ where: { id: especialidadId } });
    const sub = await prisma.subespecialidad.findUnique({ where: { id: subespecialidadId } });
    
    const tipo = (tipoSubespecialidadId && !isNaN(Number(tipoSubespecialidadId)))
      ? await prisma.tipoSubespecialidad.findUnique({ where: { id: Number(tipoSubespecialidadId) }}) 
      : null;
      
    if (!esp || !sub) {
      throw new Error("Especialidad o subespecialidad inválida");
    }

    // Lógica de construcción del prefijo
    const pEsp = esp.nombre.substring(0, 2).toUpperCase();
    const pSub = sub.nombre.substring(0, 2).toUpperCase();
    const pTip = tipo ? tipo.nombre.substring(0, 2).toUpperCase() : 'XX';
    const prefijo = `${pEsp}${pSub}${pTip}`;

    const tipoString = tipo ? tipo.nombre : String(tipoSubespecialidadId);

    // Búsqueda del número correlativo
    const kitsMismaFamilia = await prisma.kit.findMany({
      where: {
        especialidadId,
        subespecialidadId,
        tipoSubespecialidad: tipoString
      }
    });
    
    const maxNumero = kitsMismaFamilia.reduce((max, k) => Math.max(max, k.numeroKit || 0), 0);
    const numeroKitReal = maxNumero + 1;
    const codigoKitReal = `${prefijo}${String(numeroKitReal).padStart(2, '0')}`;

    // Creación y relación
    return await prisma.kit.create({
      data: { 
        codigoKit: codigoKitReal, 
        nombre: `Kit ${codigoKitReal}`, 
        numeroKit: numeroKitReal, 
        especialidadId, 
        subespecialidadId,
        sedeId,
        tipoSubespecialidad: tipoString,
        estado: 'Habilitado',
        hojasDeVida: {
            connect: (instrumentosIds || []).map((id: number) => ({ id }))
        }
      },
      include: { hojasDeVida: true, sede: true }
    });
  }

  static async actualizar(id: number, data: any) {
    const { instrumentosIds, sedeId } = data;

    // 1. Desconectar instrumentos antiguos
    await prisma.hojaVidaInstrumento.updateMany({
        where: { kitId: id },
        data: { kitId: null }
    });
    
    // 2. Conectar los nuevos y actualizar sede
    return await prisma.kit.update({
        where: { id },
        data: {
            sedeId: sedeId ? sedeId : undefined,
            hojasDeVida: {
                connect: (instrumentosIds || []).map((instId: number) => ({ id: instId }))
            }
        }
    });
  }

  static async cambiarEstado(id: number, estado: string) {
    return await prisma.kit.update({
        where: { id },
        data: { estado }
    });
  }
}