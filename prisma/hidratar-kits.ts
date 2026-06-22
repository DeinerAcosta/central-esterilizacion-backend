/**
 * Hidrata los kits con instrumentos según su especialidad + subespecialidad.
 *
 * Antes: los 10 kits estaban vacíos (sin instrumentos asociados), lo que
 * rompía la vista "Aprobar estado instrumental" porque no había qué validar.
 * Esto asigna 3-5 instrumentos por kit, eligiendo de la misma esp/sub o, si
 * no alcanza, del catálogo general.
 *
 * Adicionalmente, para los traslados de kit que existen y no tienen
 * TrasladoInstrumentoEstado, los genera ahora que el kit ya tiene contenido.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const sample = <T>(arr: T[], n: number): T[] => {
  const cp = [...arr];
  const out: T[] = [];
  while (out.length < n && cp.length > 0) {
    const idx = Math.floor(Math.random() * cp.length);
    out.push(cp.splice(idx, 1)[0]);
  }
  return out;
};

async function main() {
  console.log('🌱 Hidratando kits con instrumentos…');

  const kits = await prisma.kit.findMany({
    select: { id: true, codigoKit: true, especialidadId: true, subespecialidadId: true },
  });

  let asignados = 0;
  for (const kit of kits) {
    // Instrumentos libres con la misma esp+sub
    const candidatos = await prisma.hojaVidaInstrumento.findMany({
      where: {
        kitId: null,
        especialidadId: kit.especialidadId,
        subespecialidadId: kit.subespecialidadId,
      },
      select: { id: true },
    });
    let pool = candidatos;
    if (pool.length < 3) {
      // Si no alcanza, usar instrumentos sin kit de cualquier especialidad
      const extra = await prisma.hojaVidaInstrumento.findMany({
        where: { kitId: null, id: { notIn: pool.map((i) => i.id) } },
        select: { id: true },
      });
      pool = [...pool, ...extra];
    }
    const cantidad = Math.min(pool.length, 3 + Math.floor(Math.random() * 3)); // 3-5
    const elegidos = sample(pool, cantidad);
    for (const ins of elegidos) {
      await prisma.hojaVidaInstrumento.update({
        where: { id: ins.id },
        data: { kitId: kit.id },
      });
      asignados++;
    }
    console.log(`   ${kit.codigoKit.padEnd(12)} ← ${elegidos.length} instr`);
  }

  console.log(`   ✅ ${asignados} asignaciones`);

  // Regenerar TrasladoInstrumentoEstado faltantes para traslados de kit
  console.log('\n🔄 Generando estados faltantes en traslados de kit…');
  const trasladosKit = await prisma.historialTraslado.findMany({
    where: { kitId: { not: null }, estado: { in: ['Pendiente', 'En préstamo', 'Prórroga', 'Vencido', 'En recepción'] } },
    include: {
      kit: { include: { hojasDeVida: { select: { id: true } } } },
      instrumentosEstado: { select: { id: true } },
    },
  });

  let creados = 0;
  for (const t of trasladosKit) {
    if (t.instrumentosEstado.length > 0) continue;
    const hvs = t.kit?.hojasDeVida ?? [];
    if (hvs.length === 0) continue;
    for (const hv of hvs) {
      await prisma.trasladoInstrumentoEstado.create({
        data: { trasladoId: t.id, instrumentoId: hv.id, cantidad: 1, estado: 'Pendiente' },
      });
      creados++;
    }
  }
  console.log(`   ✅ ${creados} TrasladoInstrumentoEstado creados`);

  // Para traslados Recibido de kit: marcar todos los estados como Aprobado
  const recibidos = await prisma.historialTraslado.findMany({
    where: { kitId: { not: null }, estado: 'Recibido' },
    include: {
      kit: { include: { hojasDeVida: { select: { id: true } } } },
      instrumentosEstado: { select: { id: true } },
    },
  });
  let recibidosCreados = 0;
  for (const t of recibidos) {
    if (t.instrumentosEstado.length > 0) continue;
    const hvs = t.kit?.hojasDeVida ?? [];
    for (const hv of hvs) {
      const aprobado = Math.random() < 0.85;
      await prisma.trasladoInstrumentoEstado.create({
        data: {
          trasladoId: t.id,
          instrumentoId: hv.id,
          cantidad: 1,
          estado: aprobado ? 'Aprobado' : 'Rechazado',
          ...(aprobado ? {} : { tipoDano: pick(['Oxidado', 'Sucio', 'Dañado']), descripcion: 'Daño detectado al recibir' }),
        },
      });
      recibidosCreados++;
    }
  }
  console.log(`   ✅ ${recibidosCreados} estados de Recibidos`);

  console.log('\n🌱 Hidratación completada.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
