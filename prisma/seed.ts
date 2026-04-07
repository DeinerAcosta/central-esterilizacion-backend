import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // O usa 'bcrypt' si es el que tienes instalado

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando recuperación de usuarios...');

  // 1. Encriptamos la contraseña para que tu Login la acepte
  // Cambia '123456' por la contraseña que usabas antes
  const passwordEncriptada = await bcrypt.hash('123456', 10);

  // 2. Creamos al usuario 1 (Admin)
  const usuario1 = await prisma.usuario.upsert({
    where: { email: 'pruebas.central.esterilizacion@gmail.com' }, // Pon tu correo real aquí
    update: {},
    create: {
      codigo: 'USR-001',
      codigoVerificacion: '1234', // Este es el PIN de 4 dígitos
      nombre: 'Central',
      apellido: 'Esterilizacion',
      empresa: 'VIU',
      usuario: 'admin', // Tu username para el login
      email: 'pruebas.central.esterilizacion@gmail.com', // Tu email para el login
      password: passwordEncriptada,
      rol: 'Administrador',
      estado: true,
      esPasswordProvisional: false,
    },
  });

  // 3. Creamos al usuario 2 (Si tenías otro, pon sus datos aquí)
  const usuario2 = await prisma.usuario.upsert({
    where: { email: '' },
    update: {},
    create: {
      codigo: 'USR-002',
      codigoVerificacion: '5678',
      nombre: 'Juan',
      apellido: 'Pérez',
      empresa: 'Central de Esterilización',
      usuario: 'juanp',
      email: 'usuario2@demo.com',
      password: passwordEncriptada,
      rol: 'Operador',
      estado: true,
      esPasswordProvisional: false,
    },
  });

  console.log('✅ Usuarios recuperados con éxito:');
  console.log(`- ${usuario1.email} (Username: ${usuario1.usuario})`);
  console.log(`- ${usuario2.email} (Username: ${usuario2.usuario})`);
}

main()
  .catch((e) => {
    console.error('❌ Error al crear usuarios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });