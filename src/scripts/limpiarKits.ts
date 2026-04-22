import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Iniciando limpieza exclusiva del módulo KITS...");

  try {
    console.log("- Borrando relación de instrumentos en kits...");
    await prisma.instrumentoEnKit.deleteMany();
    console.log("- Liberando instrumentos físicos...");
    await prisma.hojaVidaInstrumento.updateMany({
      where: {
        kitId: { not: null }
      },
      data: {
        kitId: null
      }
    });
    console.log("- Borrando historial de traslados vinculados a kits...");
    await prisma.historialTraslado.deleteMany({
      where: {
        kitId: { not: null }
      }
    });
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