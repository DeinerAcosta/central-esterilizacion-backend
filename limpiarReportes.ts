import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function limpiarBaseDeDatos() {
  try {
    console.log('⏳ Iniciando la eliminación de reportes...');

    // Elimina todos los registros de la tabla Reporte
    const resultado = await prisma.reporte.deleteMany({});

    console.log(`✅ ¡Éxito! Se eliminaron ${resultado.count} reportes de la base de datos.`);
  } catch (error) {
    console.error('❌ Error al eliminar los reportes:', error);
  } finally {
    // Es importante desconectar el cliente de Prisma al terminar
    await prisma.$disconnect();
  }
}

limpiarBaseDeDatos();