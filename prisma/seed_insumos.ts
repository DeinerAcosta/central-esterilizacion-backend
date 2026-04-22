import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Insertando Unidades de Medida y Presentaciones...');

  await prisma.unidadMedida.createMany({
    data: [
      { nombre: 'Unidad', estado: true },
      { nombre: 'Caja', estado: true },
      { nombre: 'Paquete', estado: true },
      { nombre: 'Galón', estado: true }
    ],
    skipDuplicates: true,
  });

  await prisma.presentacion.createMany({
    data: [
      { nombre: 'Individual', estado: true },
      { nombre: 'Caja x 50', estado: true },
      { nombre: 'Caja x 100', estado: true },
      { nombre: 'Frasco x 500ml', estado: true }
    ],
    skipDuplicates: true,
  });

  console.log('✅ ¡Datos base creados exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });