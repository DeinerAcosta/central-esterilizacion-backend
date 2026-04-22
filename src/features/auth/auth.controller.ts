import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; 
import { enviarCorreoProvisional, enviarCorreoConfirmacionCambio } from '../../services/email.service';

const prisma = new PrismaClient();

export const loginUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, usuario, password } = req.body;

    const identificador = email || usuario;

    if (!identificador || !password) {
      res.status(400).json({ msg: 'Por favor ingrese su usuario/correo y contraseña' });
      return;
    }

    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: identificador },
          { usuario: identificador }
        ]
      }
    });

    if (!user) {
      res.status(401).json({ msg: 'Usuario o contraseña incorrectos' }); 
      return;
    }

    if (!user.estado) {
      res.status(403).json({ msg: 'Usuario inactivo. Contacte al administrador.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid && password !== user.password) {
      res.status(401).json({ msg: 'Usuario o contraseña incorrectos' });
      return;
    }

    res.json({
      msg: 'Login exitoso',
      usuario: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        email: user.email,
        rol: user.rol,
        registroContable: user.registroContable, 
        esPropietario: user.esPropietario,
        esPasswordProvisional: user.esPasswordProvisional 
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

export const recuperarPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const valorIngresado = req.body.email || req.body.usuario;

    if (!valorIngresado) {
      res.status(400).json({ msg: 'Por favor ingrese su usuario o correo electrónico' });
      return;
    }

    const identificador = String(valorIngresado).trim();

    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: identificador },
          { usuario: identificador }
        ]
      }
    });

    if (!usuario) {
      res.status(404).json({ msg: 'El correo ingresado no está registrado en el sistema' });
      return;
    }

    const numeroAleatorio = Math.floor(Math.random() * 10);
    const textoAleatorio = Math.random().toString(36).slice(-6).toUpperCase();
    const tempPass = `T${numeroAleatorio}${textoAleatorio}`;

    const correoDestino = usuario.email ? usuario.email.trim() : "";
    
    if (!correoDestino) {
      res.status(500).json({ msg: "El usuario encontrado no tiene un correo válido registrado." });
      return;
    }

    try {
      await enviarCorreoProvisional(correoDestino, tempPass, usuario.nombre, usuario.usuario);
    } catch (emailError) {
      res.status(500).json({ msg: "Error al enviar el correo." });
      return;
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password: tempPass, 
        esPasswordProvisional: true
      }
    });

    res.json({ msg: "Se ha enviado una contraseña provisional a su correo electrónico" });

  } catch (error) {
    console.error('Error en recuperación:', error);
    res.status(500).json({ msg: "Ocurrió un error al procesar la solicitud." });
  }
};

export const cambiarPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, passwordActual, nuevaPassword } = req.body;

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    let isCurrentValid = false;
    if (usuario) {
        if (usuario.esPasswordProvisional) {
             isCurrentValid = (passwordActual === usuario.password);
        } else {
             isCurrentValid = await bcrypt.compare(passwordActual, usuario.password);
             if (!isCurrentValid) isCurrentValid = (passwordActual === usuario.password);
        }
    }

    if (!usuario || !isCurrentValid) {
      res.status(400).json({ msg: "La contraseña no coinciden" });
      return;
    }

    if (nuevaPassword === passwordActual) {
      res.status(400).json({ msg: "La nueva contraseña no puede ser igual a la provisional" });
      return;
    }

    if (nuevaPassword.length < 8) {
      res.status(400).json({ msg: "Falta caracteres (mínimo 8)" });
      return;
    }

    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(nuevaPassword)) {
      res.status(400).json({ msg: "Falta seguridad en la contraseña" });
      return;
    }

    const hashedNewPassword = await bcrypt.hash(nuevaPassword, 10);

    await prisma.usuario.update({
      where: { email },
      data: {
        password: hashedNewPassword,
        esPasswordProvisional: false 
      }
    });

    enviarCorreoConfirmacionCambio(email).catch(err => console.error(err));

    res.json({ msg: "Contraseña actualizada exitosamente." });

  } catch (error) {
    console.error("❌ Error al cambiar la contraseña:", error); 
    res.status(500).json({ msg: "Error al actualizar la contraseña." });
  }
};