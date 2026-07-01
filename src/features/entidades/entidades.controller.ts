import { Request, Response } from 'express';
import { z } from 'zod';
import { EntidadesService } from './entidades.service';

const entidadSchema = z.object({
  nombre: z.string({ message: 'El nombre es obligatorio' }).min(2, 'El nombre debe tener al menos 2 caracteres'),
  nit:         z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
  ciudad:      z.string().optional().nullable(),
  contacto:    z.string().optional().nullable(),
  correo:      z.string().email('Correo inválido').optional().nullable().or(z.literal('')),
});

const estadoSchema = z.object({
  estado: z.boolean({ message: 'El estado debe ser booleano' }),
});

export const listar = async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || undefined;
    const ciudad = (req.query.ciudad as string) || undefined;
    const data = await EntidadesService.listar(search, ciudad);
    res.json({ success: true, data, total: data.length });
  } catch (e) {
    console.error('entidades/listar:', e);
    res.status(500).json({ msg: 'Error al obtener las entidades' });
  }
};

export const listarCiudades = async (_req: Request, res: Response) => {
  try {
    const data = await EntidadesService.ciudades();
    res.json({ success: true, data });
  } catch (e) {
    console.error('entidades/ciudades:', e);
    res.status(500).json({ msg: 'Error al obtener ciudades' });
  }
};

export const crear = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = entidadSchema.parse(req.body);
    const entidad = await EntidadesService.crear({
      ...data,
      nit: data.nit ?? undefined,
      responsable: data.responsable ?? undefined,
      ciudad: data.ciudad ?? undefined,
      contacto: data.contacto ?? undefined,
      correo: data.correo ?? undefined,
    });
    res.status(201).json({ success: true, data: entidad });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ msg: e.issues[0].message });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    if (err?.message === 'NIT_DUPLICADO') {
      res.status(400).json({ msg: 'Ya existe una entidad con ese NIT' });
      return;
    }
    if (err?.code === 'P2002') {
      res.status(400).json({ msg: 'Ya existe una entidad con ese nombre' });
      return;
    }
    console.error('entidades/crear:', e);
    res.status(500).json({ msg: 'Error al crear la entidad' });
  }
};

export const actualizar = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ msg: 'Id inválido' }); return; }
    const data = entidadSchema.parse(req.body);
    const entidad = await EntidadesService.actualizar(id, {
      ...data,
      nit: data.nit ?? undefined,
      responsable: data.responsable ?? undefined,
      ciudad: data.ciudad ?? undefined,
      contacto: data.contacto ?? undefined,
      correo: data.correo ?? undefined,
    });
    res.json({ success: true, data: entidad });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ msg: e.issues[0].message });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    if (err?.message === 'NIT_DUPLICADO') {
      res.status(400).json({ msg: 'Ya existe una entidad con ese NIT' });
      return;
    }
    console.error('entidades/actualizar:', e);
    res.status(500).json({ msg: 'Error al actualizar la entidad' });
  }
};

export const cambiarEstado = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ msg: 'Id inválido' }); return; }
    const { estado } = estadoSchema.parse(req.body);
    const entidad = await EntidadesService.cambiarEstado(id, estado);
    res.json({ success: true, data: entidad });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({ msg: e.issues[0].message });
      return;
    }
    console.error('entidades/estado:', e);
    res.status(500).json({ msg: 'Error al cambiar el estado' });
  }
};
