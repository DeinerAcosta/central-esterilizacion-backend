import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// OBTENER TODOS LOS KITS (✅ FILTROS Y LÍMITE CORREGIDOS)
// ==========================================
export const getKits = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    // Permite recibir limit desde React (necesario para getConsecutivoKit)
    const limit = parseInt(req.query.limit as string) || 10; 
    const skip = (page - 1) * limit;
    
    // Filtros recibidos desde el Frontend
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
    const especialidadId = req.query.especialidadId as string;
    const subespecialidadId = req.query.subespecialidadId as string;
    const sedeId = req.query.sedeId as string;

    const whereClause: any = {};

    // Aplicar filtros exactos
    if (estadoFiltro) whereClause.estado = estadoFiltro;
    if (especialidadId) whereClause.especialidadId = Number(especialidadId);
    if (subespecialidadId) whereClause.subespecialidadId = Number(subespecialidadId);
    if (sedeId) whereClause.sedeId = Number(sedeId);

    // Búsqueda aproximada por Código o Nombre
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

    // Formatear la respuesta para que React reciba los instrumentos correctamente
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

// ==========================================
// CREAR KIT
// ==========================================
export const createKit = async (req: Request, res: Response) => {
  try {
    const { especialidadId, subespecialidadId, tipoSubespecialidadId, sedeId, instrumentosIds } = req.body;

    // 1. Traer los datos reales para armar el prefijo
    const esp = await prisma.especialidad.findUnique({ where: { id: Number(especialidadId) } });
    const sub = await prisma.subespecialidad.findUnique({ where: { id: Number(subespecialidadId) } });
    const tipo = tipoSubespecialidadId ? await prisma.tipoSubespecialidad.findUnique({ where: { id: Number(tipoSubespecialidadId) }}) : null;

    if (!esp || !sub) {
      return res.status(400).json({ msg: "Especialidad o subespecialidad inválida" });
    }

    // 2. Armar el prefijo (Ej: ORMAXX)
    const pEsp = esp.nombre.substring(0, 2).toUpperCase();
    const pSub = sub.nombre.substring(0, 2).toUpperCase();
    const pTip = tipo ? tipo.nombre.substring(0, 2).toUpperCase() : 'XX';
    const prefijo = `${pEsp}${pSub}${pTip}`;

    // 3. 🔍 Buscar TODOS los kits que comparten exactamente esta misma familia
    const kitsMismaFamilia = await prisma.kit.findMany({
      where: {
        especialidadId: Number(especialidadId),
        subespecialidadId: Number(subespecialidadId),
        tipoSubespecialidad: tipo ? tipo.nombre : String(tipoSubespecialidadId)
      }
    });

    // 4. 📈 Calcular el consecutivo real sumando +1 al mayor número encontrado
    const maxNumero = kitsMismaFamilia.reduce((max, k) => Math.max(max, k.numeroKit || 0), 0);
    const numeroKitReal = maxNumero + 1;
    
    // Armar el código final garantizado como único (Ej: ORMAXX01, ORMAXX02...)
    const codigoKitReal = `${prefijo}${String(numeroKitReal).padStart(2, '0')}`;

    // 5. Guardar en base de datos
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

// ==========================================
// ACTUALIZAR KIT
// ==========================================
export const updateKit = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { instrumentosIds, sedeId } = req.body;
        
        // 1. Liberamos los instrumentos que tenía el Kit anteriormente
        await prisma.hojaVidaInstrumento.updateMany({
            where: { kitId: Number(id) },
            data: { kitId: null }
        });
        
        // 2. Actualizamos con la nueva Sede y conectamos los nuevos instrumentos
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

// ==========================================
// CAMBIAR ESTADO DEL KIT
// ==========================================
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