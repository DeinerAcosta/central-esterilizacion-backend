import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Obtener lista paginada
export const getMarcas = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
    const limit = 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      OR: [
        { nombre: { contains: search } },
        { codigo: { contains: search } }
      ]
    };

    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, marcas] = await Promise.all([
      prisma.marca.count({ where: whereClause }),
      prisma.marca.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ estado: 'desc' }, { id: 'desc' }]
      })
    ]);

    res.json({ data: marcas, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error en getMarcas:", error);
    res.status(500).json({ msg: "Error al obtener marcas" });
  }
};

// 2. Crear nueva marca
export const createMarca = async (req: Request, res: Response) => {
  try {
    const { nombre, estado } = req.body;

    // Generar código consecutivo MAR-001
    const total = await prisma.marca.count();
    const codigo = `MAR-${String(total + 1).padStart(3, '0')}`;

    const nuevaMarca = await prisma.marca.create({
      data: {
        codigo,
        nombre: String(nombre).trim(),
        estado: estado !== undefined ? Boolean(estado) : true
      }
    });

    res.status(201).json({ msg: "Marca creada correctamente", data: nuevaMarca });
  } catch (error: any) {
    console.error("Error al crear marca:", error);
    if (error.code === 'P2002') return res.status(400).json({ msg: "El nombre de la marca ya existe." });
    res.status(500).json({ msg: "Error al crear la marca" });
  }
};

// 3. Editar marca existente
export const updateMarca = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    await prisma.marca.update({
      where: { id: Number(id) },
      data: { nombre: String(nombre).trim() }
    });

    res.json({ msg: "Marca actualizada correctamente" });
  } catch (error: any) {
    console.error("Error al actualizar marca:", error);
    if (error.code === 'P2002') return res.status(400).json({ msg: "El nombre de la marca ya existe." });
    res.status(500).json({ msg: "Error al actualizar la marca" });
  }
};

// 4. Activar o Inactivar
export const toggleEstadoMarca = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    await prisma.marca.update({
      where: { id: Number(id) },
      data: { estado: Boolean(estado) }
    });

    res.json({ msg: "Estado de marca actualizado" });
  } catch (error) {
    console.error("Error al cambiar estado de marca:", error);
    res.status(500).json({ msg: "Error al cambiar el estado de la marca" });
  }
};