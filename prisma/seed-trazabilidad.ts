/**
 * seed-trazabilidad.ts
 * Crea data masiva de prueba para el módulo de Trazabilidad.
 *
 * Genera:
 *   - 30 ciclos en estado "Distribución" (tab Asignaciones)
 *   - 20 ciclos en estado "Finalizado" / "Entregado" (tab Ciclos)
 *   - Escaneos de instrumentos en cada ciclo
 *   - Variedad de especialidades, sedes, quirófanos, fechas
 *
 * Uso:
 *   npx ts-node prisma/seed-trazabilidad.ts
 *
 * REQUISITO: La BD debe tener al menos:
 *   - Usuarios, Kits, HojaVidaInstrumento, Sedes, Especialidades
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Utilidades ───────────────────────────────────────────────
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const fechaPasada = (diasAtras: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d;
};

const padCiclo = (n: number) => `C-${String(n).padStart(5, '0')}`;

// ─── Datos de prueba variados ─────────────────────────────────
const QUIROFANOS_NOMBRES = [
  'Quirófano 1', 'Quirófano 2', 'Quirófano 3',
  'Sala de Cirugía A', 'Sala de Cirugía B', 'UCI',
];

const INSTRUMENTADORES = [
  'Ana García', 'Carlos Pérez', 'María López',
  'Juan Rodríguez', 'Sofía Martínez', 'Diego Hernández',
];

const TIPOS_SELLADO = ['Papel crepé', 'Papel grado médico', 'Tela'];
const TIPOS_EMPAQUE = ['Bolsa Mixta', 'Contenedor Rígido', 'Papel'];
const TIPOS_ESTERILIZACION = ['Autoclave', 'Statim', 'Óxido de Etileno'];
const AUTOCLAVE_TIPOS = ['Vapor', 'Gas'];
const ESTADOS_GLOBALES_CICLOS = ['Finalizado', 'Entregado'];

async function main() {
  console.log('🌱 Iniciando seed de Trazabilidad...');

  // ─── 1. Obtener datos existentes necesarios ────────────────
  const usuarios    = await prisma.usuario.findMany({ take: 5 });
  const kits        = await prisma.kit.findMany({
    take: 15,
    where: { estado: 'Habilitado' },
    include: { especialidad: true, subespecialidad: true },
  });
  const instrumentos = await prisma.hojaVidaInstrumento.findMany({ take: 20 });
  const sedes       = await prisma.sede.findMany({ take: 5 });

  if (usuarios.length === 0)    throw new Error('❌ No hay usuarios. Corre seed.ts primero.');
  if (kits.length === 0)        throw new Error('❌ No hay kits. Corre seed-kits.ts primero.');
  if (instrumentos.length === 0) throw new Error('❌ No hay instrumentos. Corre seed-instrumentos.ts primero.');
  if (sedes.length === 0)       throw new Error('❌ No hay sedes. Corre seed.ts primero.');

  console.log(`   Encontrados: ${usuarios.length} usuarios, ${kits.length} kits, ${instrumentos.length} instrumentos, ${sedes.length} sedes`);

  // ─── 2. Limpiar ciclos de seed anteriores ─────────────────
  console.log('🧹 Limpiando ciclos de seed anteriores...');
  const ciclosViejos = await prisma.cicloEsterilizacion.findMany({
    where: { codigoCiclo: { startsWith: 'C-SEED' } },
    select: { id: true },
  });
  if (ciclosViejos.length > 0) {
    const ids = ciclosViejos.map(c => c.id);
    await prisma.escaneoInstrumento.deleteMany({ where: { cicloId: { in: ids } } });
    await prisma.insumoCiclo.deleteMany({ where: { cicloId: { in: ids } } });
    await prisma.cicloEsterilizacion.deleteMany({ where: { id: { in: ids } } });
    console.log(`   ✅ Eliminados ${ciclosViejos.length} ciclos anteriores`);
  }

  // ─── 3. Crear ciclos de ASIGNACIONES (destinoSet ~ Distribución) ──
  console.log('📋 Creando 30 ciclos de Asignaciones (Distribución)...');
  let contadorAsig = 0;

  for (let i = 0; i < 30; i++) {
    const kit      = randomItem(kits);
    const usuario  = randomItem(usuarios);
    const sede     = randomItem(sedes);
    const diasAtras = randomInt(1, 60);

    // Instrumentos aleatorios para este ciclo (2-5)
    const instrsCiclo = instrumentos
      .slice(0, randomInt(2, Math.min(5, instrumentos.length)))
      .map((inst, idx) => ({
        instrumentoId: inst.id,
        etapa: 0,
        estadoFisico: idx % 4 === 0 ? 'Mal estado' : 'Buen estado',
      }));

    await prisma.cicloEsterilizacion.create({
      data: {
        codigoCiclo:          `C-SEED-A${String(i + 1).padStart(3, '0')}`,
        kitId:                kit.id,
        etapaActual:          6,
        responsableActualId:  usuario.id,
        tipoSellado:          randomItem(TIPOS_SELLADO),
        tipoEmpaque:          randomItem(TIPOS_EMPAQUE),
        cintaTest:            Math.random() > 0.5,
        quimicoInterno:       Math.random() > 0.5,
        lote:                 `L${randomInt(1000, 9999)}`,
        tipoEsterilizacion:   randomItem(TIPOS_ESTERILIZACION),
        autoclaveTipo:        randomItem(AUTOCLAVE_TIPOS),
        valorIndicador:       String(randomInt(121, 134)),
        destinoSet:           'Distribución (A Quirófano)',
        sedeDestinoId:        sede.id,
        quirofanoDestino:     randomItem(QUIROFANOS_NOMBRES),
        instrumentadorDestino: randomItem(INSTRUMENTADORES),
        estadoGlobal:         'En Curso',
        createdAt:            fechaPasada(diasAtras + 1),
        updatedAt:            fechaPasada(diasAtras),
        escaneos: {
          create: instrsCiclo,
        },
      },
    });
    contadorAsig++;
  }
  console.log(`   ✅ ${contadorAsig} ciclos de asignaciones creados`);

  // ─── 4. Crear ciclos FINALIZADOS / ENTREGADOS (tab Ciclos) ──
  console.log('📋 Creando 20 ciclos Finalizados/Entregados...');
  let contadorCiclos = 0;

  for (let i = 0; i < 20; i++) {
    const kit      = randomItem(kits);
    const usuario  = randomItem(usuarios);
    const sede     = randomItem(sedes);
    const diasAtras = randomInt(5, 120);
    const estadoGlobal = randomItem(ESTADOS_GLOBALES_CICLOS);

    const instrsCiclo = instrumentos
      .slice(0, randomInt(2, Math.min(6, instrumentos.length)))
      .map((inst, idx) => ({
        instrumentoId: inst.id,
        etapa: 5,
        estadoFisico: idx % 5 === 0 ? 'Mal estado' : 'Buen estado',
      }));

    await prisma.cicloEsterilizacion.create({
      data: {
        codigoCiclo:          `C-SEED-F${String(i + 1).padStart(3, '0')}`,
        kitId:                kit.id,
        etapaActual:          6,
        responsableActualId:  usuario.id,
        tipoSellado:          randomItem(TIPOS_SELLADO),
        tipoEmpaque:          randomItem(TIPOS_EMPAQUE),
        cintaTest:            Math.random() > 0.5,
        quimicoInterno:       Math.random() > 0.5,
        lote:                 `L${randomInt(1000, 9999)}`,
        tipoEsterilizacion:   randomItem(TIPOS_ESTERILIZACION),
        autoclaveTipo:        randomItem(AUTOCLAVE_TIPOS),
        valorIndicador:       String(randomInt(121, 134)),
        destinoSet:           'Distribución (A Quirófano)',
        sedeDestinoId:        sede.id,
        quirofanoDestino:     randomItem(QUIROFANOS_NOMBRES),
        instrumentadorDestino: randomItem(INSTRUMENTADORES),
        estadoGlobal,
        createdAt:            fechaPasada(diasAtras + 2),
        updatedAt:            fechaPasada(diasAtras),
        escaneos: {
          create: instrsCiclo,
        },
      },
    });
    contadorCiclos++;
  }
  console.log(`   ✅ ${contadorCiclos} ciclos finalizados/entregados creados`);

  // ─── 5. Resumen final ──────────────────────────────────────
  const totalCiclos = await prisma.cicloEsterilizacion.count({
    where: { codigoCiclo: { startsWith: 'C-SEED' } },
  });
  const totalEscaneos = await prisma.escaneoInstrumento.count();

  console.log('\n✅ Seed de Trazabilidad completado.');
  console.log('📊 Resumen:');
  console.log(`   - Ciclos de asignación (Distribución): ${contadorAsig}`);
  console.log(`   - Ciclos finalizados/entregados:       ${contadorCiclos}`);
  console.log(`   - Total ciclos SEED en BD:             ${totalCiclos}`);
  console.log(`   - Total escaneos en BD:                ${totalEscaneos}`);
  console.log('\n💡 Para probar filtros usa:');
  console.log('   Tab "Asignaciones" → verás los 30 ciclos con destinoSet = Distribución');
  console.log('   Tab "Ciclos"       → verás los 20 ciclos Finalizado/Entregado');
}

main()
  .catch(e => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });