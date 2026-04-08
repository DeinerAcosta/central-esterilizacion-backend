import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function rescatarUsuarios() {
  console.log("Iniciando rescate de usuarios antiguos...");

  const nuevaPassword = 'Colombia.2026*';
  const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
  const adminUpdate = await prisma.usuario.updateMany({
    where: { email: 'pruebas.central.esterilizacion@gmail.com' },
    data: { 
      password: hashedPassword,
      usuario: 'admin.central',
      apellido: 'Sistema',
      empresa: 'VIU',
      esPasswordProvisional: false
    }
  });

  const operadorUpdate = await prisma.usuario.updateMany({
    where: { email: 'admin@hospital.com' },
    data: { 
      password: hashedPassword,
      usuario: 'operador.hospital',
      apellido: 'Hospital',
      empresa: 'Fundación',
      rol: 'Operario',
      esPasswordProvisional: false
    }
  });

  console.log(`✅ Administradores actualizados: ${adminUpdate.count}`);
  console.log(`✅ Operadores actualizados: ${operadorUpdate.count}`);
  console.log("¡Listo! Ya puedes iniciar sesión con ambos usando la contraseña: Colombia.2026*");
}

rescatarUsuarios()
  .catch((e) => {
    console.error("Hubo un error en el rescate:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });