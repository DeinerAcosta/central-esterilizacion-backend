import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSedes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
    const whereClause: any = { nombre: { contains: search } };
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;
    const [total, sedes] = await Promise.all([
      prisma.sede.count({ where: whereClause }),
      prisma.sede.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ estado: 'desc' }, { nombre: 'asc' }]
      })
    ]);
    res.json({ data: sedes, total, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener sedes" });
  }
};

export const createSede = async (req: Request, res: Response) => {
  try {
    const { nombre, pais, ciudad, direccion, responsable } = req.body;
    if (!nombre || !pais || !ciudad || !direccion || !responsable) {
        return res.status(400).json({ msg: "Por favor complete todos los campos obligatorios." });
    }
    if (!/^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ.\-]+$/.test(nombre)) {
      return res.status(400).json({ msg: "El nombre de la sede contiene caracteres inválidos (solo letras y números permitidos)." });
    }
    const nuevaSede = await prisma.sede.create({ 
      data: { 
        nombre: String(nombre),
        pais: String(pais),
        ciudad: String(ciudad),
        direccion: String(direccion),
        responsable: String(responsable)
      } 
    });   
    res.status(201).json({ msg: "Sede creada correctamente", data: nuevaSede });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ msg: "Ya existe una sede con este nombre" });
    res.status(500).json({ msg: "Error al crear la sede" });
  }
};

export const updateSede = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, pais, ciudad, direccion, responsable } = req.body;
    if (!nombre || !pais || !ciudad || !direccion || !responsable) {
        return res.status(400).json({ msg: "Por favor complete todos los campos obligatorios." });
    }
    if (!/^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ.\-]+$/.test(nombre)) {
        return res.status(400).json({ msg: "El nombre de la sede contiene caracteres inválidos (solo letras y números permitidos)." });
    }
    await prisma.sede.update({ 
      where: { id: Number(id) }, 
      data: { 
        nombre: String(nombre),
        pais: String(pais),
        ciudad: String(ciudad),
        direccion: String(direccion),
        responsable: String(responsable)
      } 
    });
    
    res.json({ msg: "Sede actualizada correctamente" });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ msg: "Ya existe otra sede con este nombre" });
    res.status(500).json({ msg: "Error al actualizar" });
  }
};

export const toggleEstadoSede = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    await prisma.sede.update({ where: { id: Number(id) }, data: { estado: Boolean(estado) } });
    res.json({ msg: "Estado actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ msg: "Error al cambiar estado" });
  }
};