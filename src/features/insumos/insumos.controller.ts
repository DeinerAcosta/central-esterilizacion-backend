import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getListasSoporte = async (req: Request, res: Response) => {
  try {
    const unidades = await prisma.unidadMedida.findMany({ where: { estado: true } });
    const presentaciones = await prisma.presentacion.findMany({ where: { estado: true } });
    const proveedores = await prisma.proveedor.findMany({
      where: { estado: true }
    });
    
    res.json({ unidades, presentaciones, proveedores });
  } catch (error) {
    console.error("Error cargando listas soporte:", error);
    res.status(500).json({ msg: "Error al cargar listas de soporte" });
  }
};

export const getInsumos = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10; 
    const skip = (page - 1) * limit;   
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
    const whereClause: any = {
      nombre: { contains: search }
    };
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;
    const [total, insumos] = await Promise.all([
      prisma.insumoQuirurgico.count({ where: whereClause }),
      prisma.insumoQuirurgico.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          unidadMedida: { select: { nombre: true } },
          presentacion: { select: { nombre: true } }
          // proveedor: { select: { nombre: true } } <-- COMENTADO PORQUE NO EXISTE EN LA BD AÚN
        },
        orderBy: [
          { estado: 'desc' },
          { id: 'desc' }
        ]
      })
    ]);

    res.json({
      data: insumos,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener insumos" });
  }
};

export const createInsumo = async (req: Request, res: Response) => {
  try {
    let { codigo, nombre, descripcion, unidadMedidaId, presentacionId, requiereEsterilizacion, tipoEsterilizacion } = req.body;

    if (!codigo || codigo.trim() === '') {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const count = await prisma.insumoQuirurgico.count();
      codigo = `INS-${count + 1}-${randomPart}`;
    }
    const nuevoInsumo = await prisma.insumoQuirurgico.create({
      data: {
        codigo,
        nombre,
        descripcion,
        unidadMedidaId: Number(unidadMedidaId),
        presentacionId: Number(presentacionId),
        requiereEsterilizacion: Boolean(requiereEsterilizacion),
        tipoEsterilizacion: tipoEsterilizacion || null
      }
    });

    res.status(201).json({ msg: "Insumo creado exitosamente", data: nuevoInsumo });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre o código del insumo ya existe" });
    } else {
      res.status(500).json({ msg: "Error al crear el insumo" });
    }
  }
};

export const updateInsumo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, unidadMedidaId, presentacionId, requiereEsterilizacion, tipoEsterilizacion } = req.body;

    const insumoActualizado = await prisma.insumoQuirurgico.update({
      where: { id: Number(id) },
      data: {
        nombre,
        descripcion,
        unidadMedidaId: Number(unidadMedidaId),
        presentacionId: Number(presentacionId),
        // proveedorId: proveedorId ? Number(proveedorId) : null, <-- COMENTADO
        requiereEsterilizacion: Boolean(requiereEsterilizacion),
        tipoEsterilizacion: tipoEsterilizacion || null
      }
    });

    res.json({ msg: "Insumo actualizado exitosamente", data: insumoActualizado });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El nombre del insumo ya existe" });
    } else {
      res.status(500).json({ msg: "Error al actualizar el insumo" });
    }
  }
};

export const toggleEstadoInsumo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    await prisma.insumoQuirurgico.update({
      where: { id: Number(id) },
      data: { estado: Boolean(estado) }
    });

    res.json({ msg: `Insumo ${estado ? 'habilitado' : 'deshabilitado'} exitosamente` });
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar el estado" });
  }
};