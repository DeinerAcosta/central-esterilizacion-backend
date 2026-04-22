import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; 

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando recuperación de usuarios...');

  const passwordEncriptada = await bcrypt.hash('123456', 10);
  const usuario1 = await prisma.usuario.upsert({
    where: { email: 'pruebas.central.esterilizacion@gmail.com' },
    update: {},
    create: {
      codigo: 'USR-001',
      codigoVerificacion: '1234',
      nombre: 'Central',
      apellido: 'Esterilizacion',
      empresa: 'VIU',
      usuario: 'admin',
      email: 'pruebas.central.esterilizacion@gmail.com',
      password: passwordEncriptada,
      rol: 'Administrador',
      estado: true,
      esPasswordProvisional: false,
    },
  });
  
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