import { Request, Response } from 'express';
import { ControlTrazabilidadService } from './controlTrazabilidad.service';

const parseFiltros = (req: Request) => ({
  fechaDesde: req.query.fechaDesde as string | undefined,
  fechaHasta: req.query.fechaHasta as string | undefined,
  ubicacion:  req.query.ubicacion  as string | undefined,
  estado:     req.query.estado     as string | undefined,
  search:     req.query.search     as string | undefined,
  limit:      req.query.limit ? Number(req.query.limit) : undefined,
});

export const listarInstrumentos = async (req: Request, res: Response) => {
  try {
    const data = await ControlTrazabilidadService.listarInstrumentos(parseFiltros(req));
    res.json({ success: true, data, total: data.length });
  } catch (e) {
    console.error('controlTrazabilidad/instrumentos:', e);
    res.status(500).json({ msg: 'Error al obtener instrumentos' });
  }
};

export const listarKits = async (req: Request, res: Response) => {
  try {
    const data = await ControlTrazabilidadService.listarKits(parseFiltros(req));
    res.json({ success: true, data, total: data.length });
  } catch (e) {
    console.error('controlTrazabilidad/kits:', e);
    res.status(500).json({ msg: 'Error al obtener kits' });
  }
};

export const detalleInstrumento = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ msg: 'Id inválido' }); return; }
    const data = await ControlTrazabilidadService.detalleInstrumento(id);
    if (!data) { res.status(404).json({ msg: 'Instrumento no encontrado' }); return; }
    res.json({ success: true, data });
  } catch (e) {
    console.error('controlTrazabilidad/instrumentos/:id:', e);
    res.status(500).json({ msg: 'Error al obtener el detalle' });
  }
};

export const detalleKit = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ msg: 'Id inválido' }); return; }
    const data = await ControlTrazabilidadService.detalleKit(id);
    if (!data) { res.status(404).json({ msg: 'Kit no encontrado' }); return; }
    res.json({ success: true, data });
  } catch (e) {
    console.error('controlTrazabilidad/kits/:id:', e);
    res.status(500).json({ msg: 'Error al obtener el detalle' });
  }
};
