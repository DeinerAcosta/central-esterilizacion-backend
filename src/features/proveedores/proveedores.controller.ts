import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getListasSoporte = async (req: Request, res: Response) => {
  // Ya no usamos listas de soporte desde la BD, el front consume la API de CountriesNow
  res.json({ msg: "Utilizando API pública de ubicaciones en el frontend" });
};

export const getProveedores = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10; 
    const skip = (page - 1) * limit;
    
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;

    const whereClause: any = {
      OR: [
        { nombre: { contains: search } },
        { nit: { contains: search } }
      ]
    };

    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, proveedores] = await Promise.all([
      prisma.proveedor.count({ where: whereClause }),
      prisma.proveedor.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [ { estado: 'desc' }, { id: 'desc' } ]
      })
    ]);

    res.json({
      data: proveedores,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener proveedores" });
  }
};

export const createProveedor = async (req: Request, res: Response) => {
  try {
    // 1. Recibimos 'pais' y 'ciudad' (textos) en lugar de 'ciudadId'
    let { codigo, tipo, nombre, nit, pais, ciudad } = req.body;
    
    // 2. Validación estricta adaptada a los nuevos campos de texto
    if (!tipo || !nombre || !nit || !pais || !ciudad) {
        return res.status(400).json({ msg: "Por favor complete todos los campos obligatorios (Tipo, Nombre, NIT, País, Ciudad)." });
    }

    if (!/^\d+$/.test(nit)) {
        return res.status(400).json({ msg: "El NIT solo debe contener números" });
    }

    // Regla del documento: El código viene por defecto.
    if (!codigo || String(codigo).trim() === '') {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const count = await prisma.proveedor.count();
      codigo = `PROV-${count + 1}-${randomPart}`;
    }

    const nuevoProveedor = await prisma.proveedor.create({
      data: { 
        codigo: String(codigo), 
        tipo: String(tipo), 
        nombre: String(nombre), 
        nit: String(nit), 
        pais: String(pais),       // Guardamos el texto del país
        ciudad: String(ciudad)    // Guardamos el texto de la ciudad
      }
    });

    res.status(201).json({ msg: "Proveedor creado exitosamente", data: nuevoProveedor });
  } catch (error: any) {
    console.error("❌ ERROR AL CREAR PROVEEDOR:", error); 
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El NIT o el código del proveedor ya existe" });
    } else {
      res.status(500).json({ msg: "Error al crear el proveedor en la base de datos." });
    }
  }
};

export const updateProveedor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { codigo, tipo, nombre, nit, pais, ciudad } = req.body;

    if (!tipo || !nombre || !nit || !pais || !ciudad) {
        return res.status(400).json({ msg: "Por favor complete todos los campos obligatorios (Tipo, Nombre, NIT, País, Ciudad)." });
    }

    if (!/^\d+$/.test(nit)) {
        return res.status(400).json({ msg: "El NIT solo debe contener números" });
    }

    const proveedorActualizado = await prisma.proveedor.update({
      where: { id: Number(id) },
      data: { 
        ...(codigo && { codigo: String(codigo) }),
        tipo: String(tipo), 
        nombre: String(nombre), 
        nit: String(nit), 
        pais: String(pais),
        ciudad: String(ciudad)
      }
    });

    res.json({ msg: "Proveedor actualizado exitosamente", data: proveedorActualizado });
  } catch (error: any) {
    console.error("❌ ERROR AL ACTUALIZAR PROVEEDOR:", error);
    if (error.code === 'P2002') {
      res.status(400).json({ msg: "El NIT o el código del proveedor ya existe" });
    } else {
      res.status(500).json({ msg: "Error al actualizar el proveedor" });
    }
  }
};

export const toggleEstadoProveedor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    await prisma.proveedor.update({
      where: { id: Number(id) },
      data: { estado: Boolean(estado) }
    });

    res.json({ msg: `Proveedor ${estado ? 'habilitado' : 'deshabilitado'} exitosamente` });
  } catch (error) {
    console.error("❌ ERROR AL CAMBIAR ESTADO:", error);
    res.status(500).json({ msg: "Error al actualizar el estado" });
  }
};