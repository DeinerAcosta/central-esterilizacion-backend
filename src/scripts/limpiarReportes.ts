import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function limpiarBaseDeDatos() {
  try {
    console.log('⏳ Iniciando la eliminación de reportes...');

    const resultado = await prisma.reporte.deleteMany({});

    console.log(`✅ ¡Éxito! Se eliminaron ${resultado.count} reportes de la base de datos.`);
  } catch (error) {
    console.error('❌ Error al eliminar los reportes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

limpiarBaseDeDatos();