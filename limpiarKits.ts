import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Iniciando limpieza exclusiva del módulo KITS...");

  try {
    // 1. Eliminar relaciones en la tabla intermedia
    console.log("- Borrando relación de instrumentos en kits...");
    await prisma.instrumentoEnKit.deleteMany();

    // 2. Liberar los instrumentos (quitarles el kitId para que vuelvan a estar 'disponibles')
    console.log("- Liberando instrumentos físicos...");
    await prisma.hojaVidaInstrumento.updateMany({
      where: {
        kitId: { not: null }
      },
      data: {
        kitId: null
      }
    });

    // 3. Eliminar historial de traslados relacionados con kits
    console.log("- Borrando historial de traslados vinculados a kits...");
    await prisma.historialTraslado.deleteMany({
      where: {
        kitId: { not: null }
      }
    });

    // 4. Finalmente, borrar todos los kits de la tabla maestra
    console.log("- Borrando todos los Kits creados...");
    await prisma.kit.deleteMany();

    console.log("✅ ¡Limpieza de KITS completada! Tus instrumentos están libres y puedes probar crear kits desde cero.");

  } catch (error) {
    console.error("❌ Ocurrió un error durante la limpieza de kits:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();