import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { enviarCorreoVerificacion } from '../../services/email.service';

const prisma = new PrismaClient();

export class UsuariosService {
  static async obtenerTodos(page: number, limit: number, search: string, estadoFiltro?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = {
      OR: [
        { nombre: { contains: search } },
        { apellido: { contains: search } },
        { email: { contains: search } },
        { codigo: { contains: search } }
      ]
    };
    if (estadoFiltro === 'true') whereClause.estado = true;
    if (estadoFiltro === 'false') whereClause.estado = false;

    const [total, usuarios] = await Promise.all([
      prisma.usuario.count({ where: whereClause }),
      prisma.usuario.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true, codigo: true, nombre: true, apellido: true, empresa: true, cargo: true, 
          usuario: true, email: true, rol: true, esPropietario: true, registroContable: true, 
          estado: true, foto: true, permisos: true, createdAt: true, updatedAt: true
        },
        orderBy: [{ estado: 'desc' }, { createdAt: 'desc' }]
      })
    ]);

    return { total, usuarios: usuarios.map(u => ({ ...u, fotoUrl: u.foto })) };
  }

  static async crear(data: any) {
    // 1. Generar Código Público (USR-XXX)
    const totalUsuarios = await prisma.usuario.count();
    const codigoPublico = `USR-${String(totalUsuarios + 1).padStart(3, '0')}`;

    // 2. Generar PIN único de 4 dígitos
    let pin = '';
    let isPinUnique = false;
    while (!isPinUnique) {
      pin = String(Math.floor(Math.random() * 9000) + 1000);
      const existe = await prisma.usuario.findFirst({ where: { codigoVerificacion: pin } });
      if (!existe) isPinUnique = true;
    }

    // 3. Generar nombre de usuario único desde email
    let usuarioGen = data.email.split('@')[0];
    let existeUser = await prisma.usuario.findUnique({ where: { usuario: usuarioGen } });
    let counter = 1;
    while (existeUser) {
      usuarioGen = `${data.email.split('@')[0]}${counter}`;
      existeUser = await prisma.usuario.findUnique({ where: { usuario: usuarioGen } });
      counter++;
    }

    // 4. Hash password
    const hashed = await bcrypt.hash(data.password, 10);

    // 5. Guardar en DB
    const nuevo = await prisma.usuario.create({
      data: {
        ...data,
        codigo: codigoPublico,
        codigoVerificacion: pin,
        usuario: usuarioGen,
        password: hashed,
        rol: data.rol || 'Administrador',
        estado: data.estado ?? true
      }
    });

    // 6. Enviar Correo (Asíncrono)
    enviarCorreoVerificacion(data.email, data.nombre, pin).catch(console.error);

    return nuevo;
  }

  static async actualizar(id: number, data: any) {
    const dataToUpdate = { ...data };
    
    if (data.password && data.password.trim() !== '') {
      dataToUpdate.password = await bcrypt.hash(data.password, 10);
    } else {
      delete dataToUpdate.password;
    }

    return await prisma.usuario.update({
      where: { id },
      data: dataToUpdate
    });
  }

  static async cambiarEstado(id: number, estado: boolean) {
    return await prisma.usuario.update({
      where: { id },
      data: { estado }
    });
  }

  static async validarPin(pin: string) {
    return await prisma.usuario.findFirst({
      where: { codigoVerificacion: pin, estado: true },
      select: { id: true, nombre: true, apellido: true }
    });
  }
}