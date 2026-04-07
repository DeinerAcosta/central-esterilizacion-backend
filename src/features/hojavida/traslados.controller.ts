import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 1. Obtener inventario disponible por Sede
// ==========================================
export const getInventarioPorSede = async (req: Request, res: Response) => {
  try {
    const { sedeId, tipoTraslado, especialidadId, subespecialidadId, tipoId } = req.query;

    if (!sedeId) return res.status(400).json({ msg: "Debe seleccionar una sede origen" });

    if (tipoTraslado === 'kit') {
      // ── FILTROS PARA KITS ──
      const whereKit: any = { sedeId: Number(sedeId), estado: "Habilitado" };
      if (especialidadId) whereKit.especialidadId = Number(especialidadId);
      if (subespecialidadId) whereKit.subespecialidadId = Number(subespecialidadId);
      
      // FIX 1: La base de datos usa "tipoSubespecialidad" como String, no como ID
      if (tipoId) {
        const tipoObj = await prisma.tipoSubespecialidad.findUnique({ where: { id: Number(tipoId) }});
        if (tipoObj) whereKit.tipoSubespecialidad = tipoObj.nombre;
      }

      const kits = await prisma.kit.findMany({ where: whereKit });
      
      const formateados = kits.map(k => ({
        id: k.id,
        nombre: `Kit Especializado ${k.codigoKit || k.numeroKit || ''}`,
        codigoKit: k.codigoKit
      }));
      
      return res.json({ data: formateados });

    } else {
      // ── FILTROS PARA INSTRUMENTOS SUELTOS ──
      const whereInst: any = { sedeId: Number(sedeId), estado: "Habilitado" };
      if (especialidadId) whereInst.especialidadId = Number(especialidadId);
      if (subespecialidadId) whereInst.subespecialidadId = Number(subespecialidadId);
      if (tipoId) whereInst.tipoId = Number(tipoId);

      const instrumentos = await prisma.hojaVidaInstrumento.findMany({
        where: whereInst,
        include: {
          kit: true 
        }
      });
      
      const formateados = instrumentos.map(i => ({
        id: i.id,
        nombre: i.nombre,
        codigo: i.codigo,
        kit: i.kit ? { codigoKit: i.kit.codigoKit } : null,
        qty: 1 
      }));
      
      return res.json({ data: formateados });
    }
  } catch (error) {
    console.error("Error en getInventarioPorSede:", error);
    res.status(500).json({ msg: "Error al obtener el inventario de la sede" });
  }
};

// ==========================================
// 2. Ejecutar el Traslado
// ==========================================
export const ejecutarTraslado = async (req: Request, res: Response) => {
  try {
    const { sedeOrigenId, sedeDestinoId, fechaDevolucion, tipoTraslado, items } = req.body;

    if (!sedeOrigenId || !sedeDestinoId || !items || items.length === 0) {
      return res.status(400).json({ msg: "Faltan datos para realizar el traslado." });
    }
    if (sedeOrigenId === sedeDestinoId) {
      return res.status(400).json({ msg: "La sede origen no puede ser la misma que la de destino." });
    }

    if (tipoTraslado === 'kit') {
      const idsKits = items.map(Number);
      await prisma.kit.updateMany({
        where: { id: { in: idsKits }, sedeId: Number(sedeOrigenId) },
        data: { sedeId: Number(sedeDestinoId) }
      });
      await prisma.hojaVidaInstrumento.updateMany({
        where: { kitId: { in: idsKits } },
        data: { sedeId: Number(sedeDestinoId) }
      });
    } else {
      const idsInst = items.map((item: any) => Number(item.id));
      await prisma.hojaVidaInstrumento.updateMany({
        where: { id: { in: idsInst }, sedeId: Number(sedeOrigenId) },
        data: { sedeId: Number(sedeDestinoId) }
      });
    }

    res.json({ msg: "Traslado ejecutado con éxito" });
  } catch (error) {
    console.error("Error en ejecutarTraslado:", error);
    res.status(500).json({ msg: "Error al ejecutar el traslado" });
  }
};