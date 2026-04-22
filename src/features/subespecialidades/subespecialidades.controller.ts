import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getListasSoporte = async (req: Request, res: Response) => {
  try {
    const especialidades = await prisma.especialidad.findMany({ where: { estado: true } });
    res.json({ especialidades });
  } catch (error) {
    res.status(500).json({ msg: "Error al cargar listas de soporte" });
  }
};

export const getSubespecialidades = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
    const whereClause: any = { nombre: { contains: search } };
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;
    const [total, subespecialidades] = await Promise.all([
      prisma.subespecialidad.count({ where: whereClause }),
      prisma.subespecialidad.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { especialidad: true },
        orderBy: [ { estado: 'desc' }, { id: 'desc' } ]
      })
    ]);
    res.json({
      data: subespecialidades,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener subespecialidades" });
  }
};

export const createSubespecialidad = async (req: Request, res: Response) => {
  try {
    const { nombre, especialidadId } = req.body;
    if (!/^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ]+$/.test(nombre)) {
        return res.status(400).json({ msg: "El nombre solo debe contener letras" });
    }
    const existe = await prisma.subespecialidad.findFirst({
      where: { nombre, especialidadId: Number(especialidadId) }
    });
    if (existe) {
      return res.status(400).json({ msg: "Esta subespecialidad ya existe para la especialidad seleccionada" });
    }
    const last = await prisma.subespecialidad.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = last ? last.id + 1 : 1;
    const codigoGenerado = `SUB-${String(nextNum).padStart(3, '0')}`;
    const nuevaSubespecialidad = await prisma.subespecialidad.create({
      data: { codigo: codigoGenerado, nombre, especialidadId: Number(especialidadId) }
    });
    res.status(201).json({ msg: "Subespecialidad creada correctamente", data: nuevaSubespecialidad });
  } catch (error: any) {
    res.status(500).json({ msg: "Error al crear la subespecialidad" });
  }
};

export const updateSubespecialidad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, especialidadId } = req.body;
    if (!/^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ]+$/.test(nombre)) {
        return res.status(400).json({ msg: "El nombre solo debe contener letras" });
    }
    const existe = await prisma.subespecialidad.findFirst({
      where: { nombre, especialidadId: Number(especialidadId), id: { not: Number(id) } }
    });
    if (existe) {
      return res.status(400).json({ msg: "Esta subespecialidad ya existe para la especialidad seleccionada" });
    }
    const subActualizada = await prisma.subespecialidad.update({
      where: { id: Number(id) },
      data: { nombre, especialidadId: Number(especialidadId) }
    });
    res.json({ msg: "Subespecialidad actualizada correctamente", data: subActualizada });
  } catch (error: any) {
    res.status(500).json({ msg: "Error al actualizar la subespecialidad" });
  }
};

export const toggleEstadoSubespecialidad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    await prisma.subespecialidad.update({
      where: { id: Number(id) },
      data: { estado: Boolean(estado) }
    });
    res.json({ msg: `Subespecialidad ${estado ? 'habilitada' : 'deshabilitada'} correctamente` });
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar el estado" });
  }
};

export const obtenerConKits = async (req: Request, res: Response) => {
  try {
    const data = await prisma.subespecialidad.findMany({
      where: { estado: true },
      include: {
        kits: {
          where: { estado: 'Activo' } 
        }
      }
    });
    return res.json(data);
  } catch (error) {
    console.error('Error al obtener subespecialidades con kits:', error);
    return res.status(500).json({ msg: "Error al obtener datos para el sidebar" });
  }
};