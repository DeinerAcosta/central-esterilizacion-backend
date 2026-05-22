import { Prisma, PrismaClient } from '@prisma/client';
import type { CrearSolicitudInput } from './solicitudesInstrumento.schema';

const prisma = new PrismaClient();

export class SolicitudesInstrumentoService {
  static async listar(params: {
    page: number;
    limit: number;
    estado?: 'Pendiente' | 'Aprobado' | 'Rechazado';
  }) {
    const { page, limit, estado } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.SolicitudRegistroInstrumentoWhereInput = {};
    if (estado) where.estado = estado;

    const [total, solicitudes] = await Promise.all([
      prisma.solicitudRegistroInstrumento.count({ where }),
      prisma.solicitudRegistroInstrumento.findMany({
        where,
        skip,
        take: limit,
        include: {
          especialidad: true,
          subespecialidad: true,
          solicitadoPor: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data = solicitudes.map((s) => ({
      id: s.id,
      codigo: s.codigo,
      nombre: s.nombre,
      fotoUrl: s.fotoUrl,
      especialidad: s.especialidad.nombre,
      subespecialidad: s.subespecialidad.nombre,
      solicitadoPor: `${s.solicitadoPor.nombre} ${s.solicitadoPor.apellido}`,
      estado: s.estado,
      fecha: s.createdAt.toISOString().split('T')[0],
    }));

    return { total, data, totalPages: Math.ceil(total / limit), currentPage: page };
  }

  static async obtener(id: number) {
    const sol = await prisma.solicitudRegistroInstrumento.findUnique({
      where: { id },
      include: {
        especialidad: true,
        subespecialidad: true,
        solicitadoPor: true,
      },
    });
    if (!sol) throw new Error('SOLICITUD_NO_ENCONTRADA');
    return sol;
  }

  static async crear(data: CrearSolicitudInput, fotoUrl: string | null) {
    const count = await prisma.solicitudRegistroInstrumento.count();
    const codigo = `SRI-${String(count + 1).padStart(2, '0')}`;
    return prisma.solicitudRegistroInstrumento.create({
      data: {
        codigo,
        nombre: data.nombre,
        fotoUrl,
        especialidadId: data.especialidadId,
        subespecialidadId: data.subespecialidadId,
        solicitadoPorId: data.solicitadoPorId,
        estado: 'Pendiente',
      },
    });
  }
}
