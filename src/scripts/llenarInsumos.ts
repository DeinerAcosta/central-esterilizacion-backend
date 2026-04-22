import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Llenando tablas maestras de Insumos Quirúrgicos...");

  const unidades = ['Unidad', 'Caja', 'Paquete', 'Galón', 'Litro', 'Mililitro', 'Gramo', 'Metro'];
  for (const nombre of unidades) {
    await prisma.unidadMedida.upsert({
      where: { nombre },
      update: {},
      create: { nombre, estado: true },
    });
  }
  console.log("✅ Unidades de medida listas.");

  const presentaciones = ['Bolsa', 'Frasco', 'Tarro', 'Tubo', 'Sobre', 'Ampolla', 'Aerosol', 'Rollo'];
  for (const nombre of presentaciones) {
    await prisma.presentacion.upsert({
      where: { nombre },
      update: {},
      create: { nombre, estado: true },
    });
  }
  console.log("✅ Presentaciones listas.");

  console.log("🎉 ¡Todo listo! Ya puedes ir a tu pantalla y crear insumos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });