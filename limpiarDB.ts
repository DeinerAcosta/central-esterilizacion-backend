import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Iniciando limpieza de la base de datos...");

  try {
    // 1. Borrar tablas transaccionales e intermedias (dependencias)
    console.log("- Borrando Historial de Traslados...");
    await prisma.historialTraslado.deleteMany();

    console.log("- Borrando Instrumentos en Kits...");
    await prisma.instrumentoEnKit.deleteMany();

    console.log("- Borrando Hojas de Vida de Instrumentos...");
    await prisma.hojaVidaInstrumento.deleteMany();

    // 2. Borrar módulos agrupadores
    console.log("- Borrando Kits...");
    await prisma.kit.deleteMany();

    // 3. Borrar configuraciones (Sedes, Insumos, Proveedores)
    console.log("- Borrando Quirófanos...");
    await prisma.quirofano.deleteMany();

    console.log("- Borrando Sedes...");
    await prisma.sede.deleteMany();

    console.log("- Borrando Insumos Quirúrgicos...");
    await prisma.insumoQuirurgico.deleteMany();

    console.log("- Borrando Proveedores...");
    await prisma.proveedor.deleteMany();

    console.log("- Borrando Presentaciones y Unidades de Medida...");
    await prisma.presentacion.deleteMany();
    await prisma.unidadMedida.deleteMany();

    // 4. Borrar Tablas Maestras base
    console.log("- Borrando Tipos de Subespecialidad...");
    await prisma.tipoSubespecialidad.deleteMany();

    console.log("- Borrando Subespecialidades...");
    await prisma.subespecialidad.deleteMany();

    console.log("- Borrando Especialidades...");
    await prisma.especialidad.deleteMany();

    console.log("- Borrando Marcas...");
    await prisma.marca.deleteMany();

    // ⚠️ NOTA: No borramos la tabla `Usuario` para que no pierdas tu acceso al sistema.
    // Si también quieres borrar usuarios y empezar con uno nuevo, descomenta la siguiente línea:
    // await prisma.usuario.deleteMany();

    console.log("✅ ¡Limpieza completada! Tu base de datos está como nueva (conservando tus usuarios).");

  } catch (error) {
    console.error("❌ Ocurrió un error durante la limpieza:", error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });