/**
 * seed-almacenamiento.ts
 * Crea data de prueba para el módulo de Almacenamiento.
 * 
 * Uso: npx ts-node prisma/seed-almacenamiento.ts
 * 
 * IMPORTANTE: Requiere que ya existan registros en:
 *   - Kit (al menos 3)
 *   - HojaVidaInstrumento (al menos 5)
 *   - InsumoQuirurgico (al menos 4)
 *   - Usuario (al menos 1)
 *   - Quirofano (al menos 2)
 *   - Sede (al menos 1)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Utilidades ───────────────────────────────────────────────
const fechaFutura = (diasDesdeHoy: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  return d;
};

const fechaPasada = (diasAtras: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d;
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log('🌱 Iniciando seed de Almacenamiento...');

  // ─── 1. Obtener datos existentes ──────────────────────────
  const kits        = await prisma.kit.findMany({ take: 5, where: { estado: 'Habilitado' } });
  const instrumentos = await prisma.hojaVidaInstrumento.findMany({ take: 8 });
  const insumos     = await prisma.insumoQuirurgico.findMany({ take: 6, where: { estado: true } });
  const usuario     = await prisma.usuario.findFirst();
  const quirofanos  = await prisma.quirofano.findMany({ take: 3 });
  const sede        = await prisma.sede.findFirst();

  if (!usuario) throw new Error('❌ No hay usuarios en la BD. Corre seed.ts primero.');
  if (kits.length === 0 && instrumentos.length === 0) throw new Error('❌ No hay kits ni instrumentos. Corre seed-instrumentos.ts primero.');
  if (insumos.length === 0) throw new Error('❌ No hay insumos. Corre seed_insumos.ts primero.');

  // ─── 2. Limpiar inventario previo (solo de prueba) ────────
  console.log('🧹 Limpiando inventario anterior de pruebas...');
  await prisma.inventario.deleteMany({ where: { lote: 'SEED-TEST' } });

  // ─── 3. Crear stock de Kits en Inventario ─────────────────
  console.log('📦 Creando stock de kits...');
  const kitRecords = [];
  for (const kit of kits) {
    kitRecords.push({
      kitId:           kit.id,
      cantidad:        1,
      estado:          'Disponible',
      fechaVencimiento: fechaFutura(randomInt(30, 180)),
      lote:            'SEED-TEST',
    });
  }
  if (kitRecords.length > 0) {
    await prisma.inventario.createMany({ data: kitRecords });
    console.log(`  ✅ ${kitRecords.length} kits en inventario`);
  }

  // ─── 4. Crear stock de Instrumentos en Inventario ─────────
  console.log('🔧 Creando stock de instrumentos...');
  const instrRecords = [];
  for (const inst of instrumentos) {
    instrRecords.push({
      instrumentoId:   inst.id,
      cantidad:        1,
      estado:          randomInt(0, 3) === 0 ? 'En Quirófano' : 'Disponible',
      fechaVencimiento: fechaFutura(randomInt(15, 365)),
      lote:            'SEED-TEST',
    });
  }
  if (instrRecords.length > 0) {
    await prisma.inventario.createMany({ data: instrRecords });
    console.log(`  ✅ ${instrRecords.length} instrumentos en inventario`);
  }

  // ─── 5. Crear stock de Insumos en Inventario ──────────────
  console.log('💊 Creando stock de insumos...');
  const insumoRecords = [];
  for (const ins of insumos) {
    insumoRecords.push({
      insumoId:        ins.id,
      cantidad:        randomInt(5, 100),
      estado:          'Disponible',
      fechaVencimiento: fechaFutura(randomInt(60, 730)),
      lote:            `LOTE-${randomInt(1000, 9999)}`,
    });
  }
  if (insumoRecords.length > 0) {
    await prisma.inventario.createMany({ data: insumoRecords });
    console.log(`  ✅ ${insumoRecords.length} insumos en inventario`);
  }

  // ─── 6. Crear movimientos de prueba ───────────────────────
  if (quirofanos.length > 0 && kits.length > 0) {
    console.log('📋 Creando historial de movimientos...');

    // 3 envíos a quirófano
    for (let i = 0; i < Math.min(3, kits.length); i++) {
      await prisma.movimientoAlmacen.create({
        data: {
          tipoMovimiento:  'Envio_Quirofano',
          fechaMovimiento: fechaPasada(randomInt(1, 30)),
          quirofanoId:     quirofanos[i % quirofanos.length].id,
          responsableId:   usuario.id,
          detalles: {
            create: [{ kitId: kits[i].id, cantidad: 1 }]
          }
        }
      });
    }
    console.log('  ✅ 3 envíos a quirófano');

    // 4 movimientos de insumos (2 solicitudes + 2 consumos)
    if (sede && insumos.length >= 2) {
      for (let i = 0; i < 4; i++) {
        const tipoMovimiento = i < 2 ? 'Solicitud' : 'Consumo';
        await prisma.movimientoAlmacen.create({
          data: {
            tipoMovimiento,
            fechaMovimiento: fechaPasada(randomInt(1, 20)),
            sedeDestinoId:   sede.id,
            responsableId:   usuario.id,
            detalles: {
              create: [
                { insumoId: insumos[0].id, cantidad: randomInt(1, 5) },
                { insumoId: insumos[1].id, cantidad: randomInt(1, 3) },
              ]
            }
          }
        });
      }
      console.log('  ✅ 4 movimientos de insumos (2 solicitudes + 2 consumos)');
    }
  }

  console.log('\n✅ Seed de Almacenamiento completado exitosamente.');
  console.log('📊 Resumen:');
  console.log(`   - Kits en inventario:         ${kitRecords.length}`);
  console.log(`   - Instrumentos en inventario: ${instrRecords.length}`);
  console.log(`   - Insumos en inventario:      ${insumoRecords.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });