import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getKits = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10; 
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
    const especialidadId = req.query.especialidadId as string;
    const subespecialidadId = req.query.subespecialidadId as string;
    const sedeId = req.query.sedeId as string;
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
    const dataFormateada = kits.map(k => ({
        ...k,
        instrumentos: k.hojasDeVida
    }));

    res.json({ 
        data: dataFormateada, 
        total, 
        totalPages: Math.ceil(total / limit), 
        currentPage: page 
    });
  } catch (error) {
    console.error("Error al obtener kits:", error);
    res.status(500).json({ msg: "Error al obtener kits" });
  }
};

export const createKit = async (req: Request, res: Response) => {
  try {
    const { especialidadId, subespecialidadId, tipoSubespecialidadId, sedeId, instrumentosIds } = req.body;
    const esp = await prisma.especialidad.findUnique({ where: { id: Number(especialidadId) } });
    const sub = await prisma.subespecialidad.findUnique({ where: { id: Number(subespecialidadId) } });
    const tipo = tipoSubespecialidadId ? await prisma.tipoSubespecialidad.findUnique({ where: { id: Number(tipoSubespecialidadId) }}) : null;
    if (!esp || !sub) {
      return res.status(400).json({ msg: "Especialidad o subespecialidad inválida" });
    }
    const pEsp = esp.nombre.substring(0, 2).toUpperCase();
    const pSub = sub.nombre.substring(0, 2).toUpperCase();
    const pTip = tipo ? tipo.nombre.substring(0, 2).toUpperCase() : 'XX';
    const prefijo = `${pEsp}${pSub}${pTip}`;
    const kitsMismaFamilia = await prisma.kit.findMany({
      where: {
        especialidadId: Number(especialidadId),
        subespecialidadId: Number(subespecialidadId),
        tipoSubespecialidad: tipo ? tipo.nombre : String(tipoSubespecialidadId)
      }
    });
    const maxNumero = kitsMismaFamilia.reduce((max, k) => Math.max(max, k.numeroKit || 0), 0);
    const numeroKitReal = maxNumero + 1;
    const codigoKitReal = `${prefijo}${String(numeroKitReal).padStart(2, '0')}`;
    const nuevoKit = await prisma.kit.create({
      data: { 
        codigoKit: codigoKitReal, 
        nombre: `Kit ${codigoKitReal}`, 
        numeroKit: numeroKitReal, 
        especialidadId: Number(especialidadId), 
        subespecialidadId: Number(subespecialidadId),
        sedeId: Number(sedeId),
        tipoSubespecialidad: tipo ? tipo.nombre : String(tipoSubespecialidadId),
        estado: 'Habilitado',
        hojasDeVida: {
            connect: (instrumentosIds || []).map((id: number) => ({ id: Number(id) }))
        }
      },
      include: {
        hojasDeVida: true,
        sede: true
      }
    });

    res.status(201).json({ msg: "Kit creado correctamente", data: nuevoKit });
  } catch (error: any) {
    console.error("Error al crear kit:", error);
    res.status(500).json({ msg: "Error al crear el kit" });
  }
};

export const updateKit = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { instrumentosIds, sedeId } = req.body;

        await prisma.hojaVidaInstrumento.updateMany({
            where: { kitId: Number(id) },
            data: { kitId: null }
        });
        
        await prisma.kit.update({
            where: { id: Number(id) },
            data: {
                sedeId: sedeId ? Number(sedeId) : undefined,
                hojasDeVida: {
                    connect: (instrumentosIds || []).map((instId: number) => ({ id: Number(instId) }))
                }
            }
        });

        res.json({ msg: "Kit actualizado correctamente" });
    } catch (error) {
        console.error("Error al actualizar kit:", error);
        res.status(500).json({ msg: "Error al actualizar el kit" });
    }
};

export const toggleEstadoKit = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        await prisma.kit.update({
            where: { id: Number(id) },
            data: { 
                estado: estado 
            }
        });

        res.json({ msg: "Estado actualizado correctamente" });
    } catch (error) {
        console.error("Error al cambiar estado:", error);
        res.status(500).json({ msg: "Error al cambiar el estado del kit" });
    }
};