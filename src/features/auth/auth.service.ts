import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { enviarCorreoProvisional, enviarCorreoConfirmacionCambio } from '../../services/email.service';

const prisma = new PrismaClient();

export class AuthService {

  static async login(identificador: string, password: string) {
    const user = await prisma.usuario.findFirst({
      where: { OR: [{ email: identificador }, { usuario: identificador }] }
    });

    if (!user) throw new Error('CREDENCIALES_INVALIDAS');
    if (!user.estado) throw new Error('USUARIO_INACTIVO');

    const isValid = await bcrypt.compare(password, user.password)
      .catch(() => false);
    const isValidPlain = password === user.password;

    if (!isValid && !isValidPlain) throw new Error('CREDENCIALES_INVALIDAS');

    return {
      id:                    user.id,
      nombre:                user.nombre,
      usuario:               user.usuario,
      email:                 user.email,
      rol:                   user.rol,
      registroContable:      user.registroContable,
      esPropietario:         user.esPropietario,
      esPasswordProvisional: user.esPasswordProvisional,
    };
  }

  static async recuperarPassword(identificador: string) {
    const usuario = await prisma.usuario.findFirst({
      where: { OR: [{ email: identificador }, { usuario: identificador }] }
    });

    if (!usuario) throw new Error('USUARIO_NO_ENCONTRADO');
    if (!usuario.email) throw new Error('SIN_CORREO');

    const numeroAleatorio = Math.floor(Math.random() * 10);
    const textoAleatorio  = Math.random().toString(36).slice(-6).toUpperCase();
    const tempPass        = `T${numeroAleatorio}${textoAleatorio}`;

    await enviarCorreoProvisional(usuario.email.trim(), tempPass, usuario.nombre, usuario.usuario);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data:  { password: tempPass, esPasswordProvisional: true }
    });
  }

  static async cambiarPassword(email: string, passwordActual: string, nuevaPassword: string) {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) throw new Error('USUARIO_NO_ENCONTRADO');

    // Verificar contraseña actual (provisional = comparación plana, normal = bcrypt)
    let isCurrentValid = usuario.esPasswordProvisional
      ? passwordActual === usuario.password
      : await bcrypt.compare(passwordActual, usuario.password).catch(() => false);

    if (!isCurrentValid) isCurrentValid = passwordActual === usuario.password;
    if (!isCurrentValid) throw new Error('PASSWORD_INCORRECTO');

    if (nuevaPassword === passwordActual) throw new Error('PASSWORD_IGUAL');

    const hashedNewPassword = await bcrypt.hash(nuevaPassword, 10);

    await prisma.usuario.update({
      where: { email },
      data:  { password: hashedNewPassword, esPasswordProvisional: false }
    });

    enviarCorreoConfirmacionCambio(email).catch(err => console.error(err));
  }
}