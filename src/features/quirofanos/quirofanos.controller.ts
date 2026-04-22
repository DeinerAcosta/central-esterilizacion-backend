import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getListasSoporte = async (req: Request, res: Response) => {
  try {
    const sedes = await prisma.sede.findMany({ where: { estado: true } });
    res.json({ sedes });
  } catch (error) {
    res.status(500).json({ msg: "Error al cargar sedes" });
  }
};

export const getQuirofanos = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
    const whereClause: any = { nombre: { contains: search } };  
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;
    const [total, quirofanos] = await Promise.all([
      prisma.quirofano.count({ where: whereClause }),
      prisma.quirofano.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { sede: true },
        orderBy: [{ estado: 'desc' }, { id: 'desc' }]
      })
    ]);

    res.json({ data: quirofanos, total, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener quirófanos" });
  }
};

export const createQuirofano = async (req: Request, res: Response) => {
  try {
    let { codigo, nombre, sedeId } = req.body;
    if (!/^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ.\-]+$/.test(nombre)) {
      return res.status(400).json({ msg: "El nombre del quirófano contiene caracteres inválidos (solo letras y números permitidos)." });
    }
    const existe = await prisma.quirofano.findFirst({
      where: { nombre, sedeId: Number(sedeId) }
    });
    if (existe) return res.status(400).json({ msg: "Este quirófano ya existe en la sede seleccionada" });
    if (!codigo || codigo.trim() === '') {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const count = await prisma.quirofano.count();
      codigo = `QUIRO-${count + 1}-${randomPart}`;
    }
    const nuevo = await prisma.quirofano.create({
      data: { 
        codigo, 
        nombre, 
        sedeId: Number(sedeId) 
      }
    }); 
    res.status(201).json({ msg: "Quirófano creado correctamente", data: nuevo });
  } catch (error) {
    res.status(500).json({ msg: "Error al crear" });
  }
};

export const updateQuirofano = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { codigo, nombre, sedeId } = req.body;
      if (!/^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ.\-]+$/.test(nombre)) {
        return res.status(400).json({ msg: "El nombre del quirófano contiene caracteres inválidos (solo letras y números permitidos)." });
      }
      await prisma.quirofano.update({
        where: { id: Number(id) },
        data: { 
          ...(codigo && { codigo }), // Si envían el código, se actualiza, si no, se mantiene
          nombre, 
          sedeId: Number(sedeId) 
        }
      });
      
      res.json({ msg: "Quirófano actualizado correctamente" });
    } catch (error) { 
      res.status(500).json({ msg: "Error al actualizar" }); 
    }
};

export const toggleEstadoQuirofano = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      
      await prisma.quirofano.update({
        where: { id: Number(id) },
        data: { estado: Boolean(estado) }
      });
      
      res.json({ msg: "Estado actualizado correctamente" });
    } catch (error) { 
      res.status(500).json({ msg: "Error al cambiar estado" }); 
    }
};