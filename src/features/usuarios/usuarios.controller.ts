import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer'; 

const prisma = new PrismaClient();
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, 
  auth: {
    user: process.env.SMTP_USER || 'tu_correo@gmail.com', 
    pass: process.env.SMTP_PASS || 'tu_password_de_app',  
  },
});
const enviarCorreoVerificacion = async (email: string, nombre: string, codigo: string) => {
  try {
    const linkAcceso = process.env.FRONTEND_URL || 'http://localhost:5173/login';  
    const mailOptions = {
      from: '"Central de Esterilización" <no-reply@esterilizacion.com>',
      to: email,
      subject: 'Su código de verificación - Central de Esterilización',
      text: `Estimado(a) ${nombre}.\n\nA continuación, encontrará su nuevo código de verificación para el programa de CENTRAL DE ESTERILIZACIÓN:\n\nCódigo de verificación: ${codigo}\n\nPor motivos de seguridad, este código no se puede compartir.\n\nLink de acceso: ${linkAcceso}\n\nSaludos cordiales`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <p>Estimado(a) <strong>${nombre}</strong>.</p>
          <p>A continuación, encontrará su nuevo código de verificación para el programa de CENTRAL DE ESTERILIZACIÓN:</p>
          <h2 style="color: #0ea5e9;">Código de verificación: ${codigo}</h2>
          <p>Por motivos de seguridad, este código no se puede compartir.</p>
          <p>Link de acceso: <a href="${linkAcceso}" style="color: #0ea5e9;">${linkAcceso}</a></p>
          <br/>
          <p>Saludos cordiales</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo de verificación enviado exitosamente a ${email}`);
  } catch (error) {
    console.error(`❌ Error al enviar el correo a ${email}:`, error);
  }
};

export const getUsuarios = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string || '';
    const estadoFiltro = req.query.estado as string;
    const limit = 10;
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
    const usuariosFormateados = usuarios.map(u => ({
      ...u,
      fotoUrl: u.foto
    }));

    res.json({ data: usuariosFormateados, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error en getUsuarios:", error);
    res.status(500).json({ msg: "Error al obtener usuarios" });
  }
};

export const createUsuario = async (req: Request, res: Response) => {
  try {
    let { nombre, apellido, empresa, cargo, email, password, rol, esPropietario, registroContable, estado, permisos } = req.body;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ msg: "La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número." });
    }
    const totalUsuarios = await prisma.usuario.count();
    const codigoPublico = `USR-${String(totalUsuarios + 1).padStart(3, '0')}`;
    let codigoPrivadoVerificacion = '';
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 9000) + 1000; // De 1000 a 9999
      codigoPrivadoVerificacion = String(randomNum);
      const existeCodigo = await prisma.usuario.findFirst({ where: { codigoVerificacion: codigoPrivadoVerificacion } });
      if (!existeCodigo) {
        isUnique = true;
      }
    }
    let usuarioGenerado = email.split('@')[0];
    let existeUsuario = await prisma.usuario.findUnique({ where: { usuario: usuarioGenerado } });
    let counter = 1;
    while (existeUsuario) {
      usuarioGenerado = `${email.split('@')[0]}${counter}`;
      existeUsuario = await prisma.usuario.findUnique({ where: { usuario: usuarioGenerado } });
      counter++;
    }
    const hashed = await bcrypt.hash(password, 10);  
    const nuevo = await prisma.usuario.create({
      data: { 
        codigo: codigoPublico, 
        codigoVerificacion: codigoPrivadoVerificacion, 
        nombre: String(nombre),
        apellido: String(apellido),
        empresa: String(empresa),
        cargo: String(cargo),
        usuario: usuarioGenerado,
        email: String(email),
        rol: rol || 'Administrador', 
        esPropietario: Boolean(esPropietario),
        registroContable: Boolean(registroContable), 
        estado: estado !== undefined ? Boolean(estado) : true,
        password: hashed,
        permisos: permisos || {} 
      }
    });
    enviarCorreoVerificacion(email, nombre, codigoPrivadoVerificacion).catch(console.error);
    res.status(201).json({ msg: "Usuario creado correctamente. Se ha enviado el código de verificación al correo.", data: nuevo });
  } catch (error: any) {
    console.error("Error al crear usuario:", error); 
    if (error.code === 'P2002') return res.status(400).json({ msg: "El correo electrónico ya está registrado." });
    res.status(500).json({ msg: "Error al crear el usuario en la Base de Datos" });
  }
};

export const updateUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, empresa, cargo, email, password, rol, esPropietario, registroContable, estado, permisos } = req.body;
    const dataToUpdate: any = {
        nombre,
        apellido,
        empresa,
        cargo,
        email,
        rol,
        esPropietario: Boolean(esPropietario),
        registroContable: Boolean(registroContable),
        estado: Boolean(estado),
        permisos: permisos || {}
    };
    if (password && password.trim() !== '') {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
          return res.status(400).json({ msg: "La nueva contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número." });
        }
        dataToUpdate.password = await bcrypt.hash(password, 10);
    }
    await prisma.usuario.update({
        where: { id: Number(id) },
        data: dataToUpdate
    });
    res.json({ msg: "Usuario actualizado correctamente" });
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    if (error.code === 'P2002') return res.status(400).json({ msg: "El correo ya está registrado a otra persona." });
    res.status(500).json({ msg: "Error al actualizar el usuario." });
  }
};

export const toggleEstadoUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    await prisma.usuario.update({
      where: { id: Number(id) },
      data: { estado: Boolean(estado) }
    });
    res.json({ msg: "Estado actualizado correctamente" });
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    res.status(500).json({ msg: "Error al cambiar el estado del usuario." });
  }
};

export const validarPin = async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;   
    const usuario = await prisma.usuario.findFirst({
      where: { 
        codigoVerificacion: pin,
        estado: true 
      }
    });
    if (usuario) {
      return res.json({ 
        valid: true, 
        usuario: { 
          id: usuario.id, 
          nombre: usuario.nombre, 
          apellido: usuario.apellido 
        } 
      });
    } else {
      return res.json({ valid: false });
    }
  } catch (error) {
    console.error('Error validando PIN:', error);
    return res.status(500).json({ valid: false, message: 'Error interno del servidor' });
  }
};