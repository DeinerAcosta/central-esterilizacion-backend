import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getListasSoporte = async (req: Request, res: Response) => {
  try {
    const especialidades = await prisma.especialidad.findMany({
      where: { estado: true },
      include: { subespecialidades: { where: { estado: true } } }
    });
    res.json({ especialidades });
  } catch (error) {
    res.status(500).json({ msg: "Error al cargar listas de soporte" });
  }
};

export const getTiposSub = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const whereClause: any = { nombre: { contains: search } };
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, registros] = await Promise.all([
      prisma.tipoSubespecialidad.count({ where: whereClause }),
      prisma.tipoSubespecialidad.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { 
          subespecialidad: { 
            include: { especialidad: true } 
          } 
        },
        orderBy: [{ estado: 'desc' }, { id: 'desc' }]
      })
    ]);

    res.json({ data: registros, total, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener datos" });
  }
};

export const createTipoSub = async (req: Request, res: Response) => {
  try {
    const { nombre, subespecialidadId } = req.body;

    if (!/^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ]+$/.test(nombre)) {
      return res.status(400).json({ msg: "El nombre solo debe contener letras" });
    }

    const last = await prisma.tipoSubespecialidad.findFirst({ orderBy: { id: 'desc' } });
    const nextNum = last ? last.id + 1 : 1;
    const codigoGenerado = `TSUB-${String(nextNum).padStart(3, '0')}`;

    const nuevo = await prisma.tipoSubespecialidad.create({
      data: { codigo: codigoGenerado, nombre, subespecialidadId: Number(subespecialidadId) }
    });
    res.status(201).json({ msg: "Tipo de subespecialidad creado correctamente", data: nuevo });
  } catch (error) {
    res.status(500).json({ msg: "Error al crear el registro" });
  }
};

export const updateTipoSub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, subespecialidadId } = req.body;

    if (!/^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ]+$/.test(nombre)) {
        return res.status(400).json({ msg: "El nombre solo debe contener letras" });
    }

    await prisma.tipoSubespecialidad.update({
      where: { id: Number(id) },
      data: { nombre, subespecialidadId: Number(subespecialidadId) }
    });
    res.json({ msg: "Tipo de subespecialidad actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar" });
  }
};

export const toggleEstadoTipoSub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    await prisma.tipoSubespecialidad.update({
      where: { id: Number(id) },
      data: { estado: Boolean(estado) }
    });
    res.json({ msg: `Estado actualizado correctamente` });
  } catch (error) {
    res.status(500).json({ msg: "Error al cambiar el estado" });
  }
};