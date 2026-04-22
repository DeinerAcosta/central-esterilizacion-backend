import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getHojasVida = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const whereClause: any = {
      OR: [
        { codigo: { contains: search } },
        { numeroSerie: { contains: search } },
        { fabricante: { contains: search } },
        { nombre: { contains: search } },
        { referencia: { contains: search } }
      ]
    };
    if (req.query.estado) whereClause.estado = String(req.query.estado);
    if (req.query.especialidadId) whereClause.especialidadId = Number(req.query.especialidadId);
    if (req.query.subespecialidadId) whereClause.subespecialidadId = Number(req.query.subespecialidadId);
    const [total, hojas] = await Promise.all([
      prisma.hojaVidaInstrumento.count({ where: whereClause }),
      prisma.hojaVidaInstrumento.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          especialidad: true,
          subespecialidad: true,
          tipo: true,
          proveedor: true,
          marca: true,
          kit: true,
          sede: true,
          propietario: { select: { nombre: true, apellido: true } }
        },
        orderBy: { estado: 'desc' }
      })
    ]);

    res.json({ data: hojas, total, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    console.error("❌ Error al obtener hojas de vida:", error);
    res.status(500).json({ msg: "Error al obtener las hojas de vida" });
  }
};

export const createHojaVida = async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;   
    const fotoUrl = files?.['foto'] ? `/uploads/${files['foto'][0].filename}` : null;
    const garantiaUrl = files?.['garantia'] ? `/uploads/${files['garantia'][0].filename}` : null;
    const registroInvimaUrl = files?.['registroInvimaDoc'] ? `/uploads/${files['registroInvimaDoc'][0].filename}` : null;
    const codigoInstrumentoUrl = files?.['codigoInstrumentoDoc'] ? `/uploads/${files['codigoInstrumentoDoc'][0].filename}` : null;
    if (!fotoUrl || !garantiaUrl || !registroInvimaUrl || !codigoInstrumentoUrl) {
      return res.status(400).json({ msg: "Faltan archivos adjuntos obligatorios." });
    }
    const {
      nombre, especialidadId, subespecialidadId, tipoId, proveedorId,
      fabricante, marcaId, referencia, paisOrigen, numeroSerie, registroInvima,
      material, materialOtro, esterilizacion, 
      frecuenciaMantenimiento, observacionesTecnico,
      propietarioId, notasObservaciones
    } = req.body;

    if (!nombre || !especialidadId || !subespecialidadId || !numeroSerie || !registroInvima || !proveedorId || !material || !esterilizacion || !frecuenciaMantenimiento || !propietarioId) {
      return res.status(400).json({ msg: "Faltan campos obligatorios en el formulario." });
    }
    const esp = await prisma.especialidad.findUnique({ where: { id: Number(especialidadId) } });
    const sub = await prisma.subespecialidad.findUnique({ where: { id: Number(subespecialidadId) } });
    const tipo = tipoId ? await prisma.tipoSubespecialidad.findUnique({ where: { id: Number(tipoId) } }) : null;
    if (!esp || !sub) return res.status(400).json({ msg: "Especialidad o subespecialidad inválida" });
    const pEsp = esp.nombre.substring(0, 2).toUpperCase();
    const pSub = sub.nombre.substring(0, 2).toUpperCase();
    const pTip = tipo ? tipo.nombre.substring(0, 2).toUpperCase() : '--';
    const prefijo = `${pEsp}${pSub}${pTip}`;
    const count = await prisma.hojaVidaInstrumento.count();
    const codigoGenerado = `${prefijo}-${String(count + 1).padStart(3, '0')}`; 
    const nuevaHoja = await prisma.hojaVidaInstrumento.create({
      data: {
        codigo: codigoGenerado,
        nombre: String(nombre), 
        especialidadId: Number(especialidadId),
        subespecialidadId: Number(subespecialidadId),
        tipoId: tipoId ? Number(tipoId) : 0, 
        proveedorId: Number(proveedorId),
        fabricante: String(fabricante),
        marcaId: marcaId ? Number(marcaId) : null,
        referencia: referencia ? String(referencia) : null,
        paisOrigen: String(paisOrigen),
        numeroSerie: String(numeroSerie),
        registroInvima: String(registroInvima),
        material: String(material),
        materialOtro: material === 'Otros' ? materialOtro : null,
        esterilizacion: String(esterilizacion),
        frecuenciaMantenimiento: String(frecuenciaMantenimiento),
        observacionesTecnico: observacionesTecnico || null,
        propietarioId: Number(propietarioId),
        notasObservaciones: notasObservaciones || null,
        estadoActual: "P. registrar",
        cicloEsterilizacion: 0,
        estado: "P. registrar", 
        fotoUrl, garantiaUrl, registroInvimaUrl, codigoInstrumentoUrl
      }
    });

    res.status(201).json({ msg: "Hoja de vida creada exitosamente", data: nuevaHoja });
  } catch (error: any) {
    console.error("❌ Error al crear:", error);
    res.status(500).json({ msg: "Error interno al guardar" });
  }
};

export const registrarContable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fechaCompra, costoAdquisicion, iva, numeroFactura, vidaUtil } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const facturaUrl = files?.['facturaDoc'] ? `/uploads/${files['facturaDoc'][0].filename}` : null;
    const hoja = await prisma.hojaVidaInstrumento.update({
      where: { id: Number(id) },
      data: {
        fechaCompra: new Date(fechaCompra),
        costo: parseFloat(costoAdquisicion),
        iva: iva ? parseFloat(iva) : null,
        numeroFactura: String(numeroFactura),
        vidaUtil: vidaUtil ? parseFloat(vidaUtil) : null,
        facturaUrl,
        estado: "Habilitado",       
        estadoActual: "Habilitado"
      }
    });
    res.json({ msg: "Registro contable exitoso", data: hoja });
  } catch (error) {
    res.status(500).json({ msg: "Error en el registro contable" });
  }
};

export const patchEstadoHojaVida = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; 
    const inst = await prisma.hojaVidaInstrumento.findUnique({ where: { id: Number(id) }});
    if (!inst) return res.status(404).json({ msg: "No encontrado" });
    const hoja = await prisma.hojaVidaInstrumento.update({
      where: { id: Number(id) },
      data: { estado: estado, estadoActual: estado }
    });
    res.json({ msg: "Estado actualizado", data: hoja });
  } catch (error) {
    res.status(500).json({ msg: "Error al cambiar estado" });
  }
};

export const getInventario = async (req: Request, res: Response) => {
  try {
    const { especialidadId, subespecialidadId, tipoId, search } = req.query;
    const instrumentos = await prisma.hojaVidaInstrumento.findMany({
      where: {
        estado: { in: ["Habilitado", "Deshabilitado", "En mantenimiento"] },
        especialidadId: especialidadId ? Number(especialidadId) : undefined,
        subespecialidadId: subespecialidadId ? Number(subespecialidadId) : undefined,
        tipoId: tipoId ? Number(tipoId) : undefined,
        OR: search ? [{ nombre: { contains: String(search) } }, { kit: { codigoKit: { contains: String(search) } } }] : undefined
      },
      include: { especialidad: true, subespecialidad: true, tipo: true, kit: true }
    });

    const agrupado: Record<string, any> = {};
    instrumentos.forEach(inst => {
      const key = `${inst.especialidadId}-${inst.subespecialidadId}-${inst.tipoId}`;
      if (!agrupado[key]) {
        agrupado[key] = { id: key, esp: inst.especialidad?.nombre, sub: inst.subespecialidad?.nombre, tipo: inst.tipo?.nombre, cant: 0, kitsUnicos: {} };
      }
      
      if (inst.kit?.id) {
        agrupado[key].kitsUnicos[inst.kit.id] = { 
          id: inst.kit.id, 
          codigoKit: inst.kit.codigoKit, 
          estado: inst.kit.estado, 
          cantidad: (inst.kit as any).cantidad || 1 
        };
      }
    });

    const resultado = Object.values(agrupado).map(item => {
      const lista = Object.values(item.kitsUnicos) as any[];
      const totalKitsDisponibles = lista.reduce((acc, cur) => acc + (cur.cantidad || 0), 0);
      
      return { ...item, cant: totalKitsDisponibles, kits: lista };
    });
    
    res.json({ data: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error en inventario" });
  }
};

export const getControlBajas = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const { fechaDesde, fechaHasta, especialidadId, subespecialidadId, search } = req.query;
    const whereClause: any = { estado: "De baja" };
    if (especialidadId) whereClause.especialidadId = Number(especialidadId);
    if (subespecialidadId) whereClause.subespecialidadId = Number(subespecialidadId);
    if (search) {
      whereClause.OR = [
        { nombre: { contains: String(search) } },
        { codigo: { contains: String(search) } }
      ];
    }
    if (fechaDesde && fechaHasta) {
      whereClause.updatedAt = {
        gte: new Date(`${fechaDesde}T00:00:00.000Z`),
        lte: new Date(`${fechaHasta}T23:59:59.999Z`)
      };
    }
    const [total, bajas] = await Promise.all([
      prisma.hojaVidaInstrumento.count({ where: whereClause }),
      prisma.hojaVidaInstrumento.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { especialidad: true, subespecialidad: true, kit: true },
        orderBy: { updatedAt: 'desc' } 
      })
    ]);

    res.json({ data: bajas, total, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener bajas" });
  }
};

export const updateHojaVida = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const instExistente = await prisma.hojaVidaInstrumento.findUnique({ where: { id: Number(id) } });
    if (!instExistente) return res.status(404).json({ msg: "No encontrado" });
    const updateData: any = {
      nombre: data.nombre,
      especialidadId: Number(data.especialidadId),
      subespecialidadId: Number(data.subespecialidadId),
      tipoId: data.tipoId ? Number(data.tipoId) : instExistente.tipoId,
      fabricante: data.fabricante,
      marcaId: data.marcaId ? Number(data.marcaId) : null,
      referencia: data.referencia,
      numeroSerie: data.numeroSerie,
      registroInvima: data.registroInvima,
      proveedorId: Number(data.proveedorId),
      paisOrigen: data.paisOrigen,
      material: data.material,
      materialOtro: data.material === 'Otros' ? data.materialOtro : null,
      esterilizacion: data.esterilizacion,
      frecuenciaMantenimiento: data.frecuenciaMantenimiento,
      observacionesTecnico: data.observacionesTecnico,
      propietarioId: Number(data.propietarioId),
      notasObservaciones: data.notasObservaciones,
    };

    if (files?.['foto']?.[0]) updateData.fotoUrl = `/uploads/${files['foto'][0].filename}`;
    if (files?.['garantia']?.[0]) updateData.garantiaUrl = `/uploads/${files['garantia'][0].filename}`;
    if (files?.['registroInvimaDoc']?.[0]) updateData.registroInvimaUrl = `/uploads/${files['registroInvimaDoc'][0].filename}`;
    if (files?.['codigoInstrumentoDoc']?.[0]) updateData.codigoInstrumentoUrl = `/uploads/${files['codigoInstrumentoDoc'][0].filename}`;

    const hojaActualizada = await prisma.hojaVidaInstrumento.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.status(200).json({ msg: 'Actualizada correctamente', data: hojaActualizada });
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar" });
  }
};

export const buscarPorCodigo = async (req: Request, res: Response) => {
  try {
    const { codigo } = req.query;

    if (!codigo || typeof codigo !== 'string') {
      return res.status(400).json({ msg: 'El código es requerido' });
    }

    const instrumento = await prisma.hojaVidaInstrumento.findUnique({
      where: { codigo: codigo.trim() },
      include: {
        kit: true,
        especialidad: true,
        subespecialidad: true
      }
    });

    if (!instrumento) {
      return res.status(404).json({ msg: 'Instrumento no encontrado' });
    }

    return res.json({ data: instrumento });
  } catch (error) {
    console.error("❌ Error al buscar instrumento por código:", error);
    return res.status(500).json({ msg: 'Error interno del servidor al buscar el instrumento' });
  }
};