import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getEspecialidades = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const whereClause: any = { nombre: { contains: search } };
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, especialidades] = await Promise.all([
      prisma.especialidad.count({ where: whereClause }),
      prisma.especialidad.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [ { estado: 'desc' }, { id: 'desc' } ] 
      })
    ]);

    res.json({
      data: especialidades,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener especialidades" });
  }
};

export const createEspecialidad = async (req: Request, res: Response) => {
  try {
    const { nombre } = req.body;

    if (!/^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ]+$/.test(nombre)) {
        return res.status(400).json({ msg: "El nombre solo debe contener letras" });
    }

    const last = await prisma.especialidad.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = last ? last.id + 1 : 1;
    const codigoGenerado = `ESP-${String(nextNum).padStart(3, '0')}`;

    const nuevaEspecialidad = await prisma.especialidad.create({
      data: { codigo: codigoGenerado, nombre }
    });

    res.status(201).json({ msg: "Especialidad creada correctamente", data: nuevaEspecialidad });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre de la especialidad ya existe" });
    } else {
      res.status(500).json({ msg: "Error al crear la especialidad" });
    }
  }
};

export const updateEspecialidad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!/^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ]+$/.test(nombre)) {
        return res.status(400).json({ msg: "El nombre solo debe contener letras" });
    }

    const especialidadActualizada = await prisma.especialidad.update({
      where: { id: Number(id) },
      data: { nombre }
    });

    res.json({ msg: "Especialidad actualizada correctamente", data: especialidadActualizada });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre de la especialidad ya existe" });
    } else {
      res.status(500).json({ msg: "Error al actualizar la especialidad" });
    }
  }
};

export const toggleEstadoEspecialidad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    await prisma.especialidad.update({
      where: { id: Number(id) },
      data: { estado: Boolean(estado) }
    });

    res.json({ msg: `Especialidad ${estado ? 'habilitada' : 'deshabilitada'} correctamente` });
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar el estado" });
  }
};