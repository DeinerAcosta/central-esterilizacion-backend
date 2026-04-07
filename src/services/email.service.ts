import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, 
  },
});

// Se añaden los parámetros 'nombre' y 'usuario' para cumplir con la plantilla exacta.
// Tienen valores por defecto para que no se rompa tu código actual mientras ajustamos el controlador.
export const enviarCorreoProvisional = async (
  email: string, 
  tempPass: string, 
  nombre: string = 'Usuario', 
  usuario: string = email
) => {
  // Limpiamos el correo por si trae espacios invisibles que rompan Nodemailer
  const destino = email ? String(email).trim() : '';

  if (!destino) {
    throw new Error('El correo destino llegó vacío al servicio de emails.');
  }

  // Asegúrate de tener esta variable en tu .env, o usará localhost por defecto
  const linkAcceso = process.env.FRONTEND_URL || 'http://localhost:5173';

  const mailOptions = {
    from: `"Central de Esterilización" <${process.env.SMTP_USER}>`,
    to: destino, // <-- AQUÍ USAMOS LA VARIABLE LIMPIA PARA EVITAR EL ERROR "No recipients defined"
    // Asunto exacto requerido por el documento
    subject: 'Recuperación de contraseña – Acceso a la plataforma',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p>Estimado(a) ${nombre},</p>
        
        <p>Hemos recibido una solicitud de recuperación de contraseña para su cuenta en nuestra plataforma.</p>
        
        <p>A continuación, encontrará su nueva contraseña provisional:</p>
        
        <p>
          Usuario: <strong>${usuario}</strong><br>
          Contraseña provisional: <strong>${tempPass}</strong>
        </p>
        
        <p>Por motivos de seguridad, esta contraseña es temporal y deberá ser modificada obligatoriamente al ingresar a la plataforma.</p>
        
        <p>Link de acceso: <a href="${linkAcceso}" style="color: #2563eb; text-decoration: none;">${linkAcceso}</a></p>
        
        <p>Saludos, cordiales</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Correo provisional enviado a: ${destino}`);
  } catch (error) {
    console.error('❌ Error al enviar el correo provisional:', error);
    // El documento pide que si esto falla, se maneje el error en el controlador
    throw new Error('Error de SMTP');
  }
};

export const enviarCorreoConfirmacionCambio = async (email: string) => {
  const destino = email ? String(email).trim() : '';

  if (!destino) return; // Validación de seguridad

  const mailOptions = {
    from: `"Central de Esterilización" <${process.env.SMTP_USER}>`,
    to: destino,
    subject: '✅ Cambio de Contraseña Exitoso',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981;">Contraseña Actualizada</h2>
        <p>Estimado(a) Usuario(a),</p>
        <p>Le informamos que su contraseña ha sido actualizada exitosamente en el sistema de Central de Esterilización.</p>
        <p>Ya puede acceder a los módulos autorizados con su nueva clave de seguridad.</p>
        <div style="background-color: #fef2f2; padding: 10px; border-left: 4px solid #ef4444; margin: 20px 0;">
          <small><strong>SEGURIDAD:</strong> Si usted no realizó este cambio, comuníquese inmediatamente con soporte técnico.</small>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Correo de confirmación enviado a: ${destino}`);
  } catch (error) {
    console.error('❌ Error al enviar correo de confirmación:', error);
  }
};