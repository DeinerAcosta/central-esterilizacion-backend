/**
 * Migración de datos — convierte los valores antiguos de Reporte.tipoDano
 * a los 3 valores válidos del catálogo (doc Tareas Pendientes):
 *
 *   Oxidado · Sucio · Dañado
 *
 * Mapeo conservador:
 *   Corrosión / Óxido               → Oxidado
 *   Sucio / Manchado / Residuo      → Sucio
 *   resto (Defectuoso, Fractura,
 *   Partido, Deformación, Deterioro,
 *   Roto, etc.)                     → Dañado
 *
 * También afecta el campo TrasladoInstrumentoEstado.tipoDano (cuando
 * existe), porque el modal de aprobación de traslado escribe en él.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mapear = (v?: string | null): string => {
  if (!v) return 'Dañado';
  const s = v.toLowerCase();
  if (s.includes('oxid') || s.includes('corros') || s.includes('óxido') || s.includes('oxido')) return 'Oxidado';
  if (s.includes('sucio') || s.includes('manch') || s.includes('residuo')) return 'Sucio';
  return 'Dañado';
};

async function main() {
  console.log('🔄 Migrando Reporte.tipoDano → Oxidado/Sucio/Dañado…');
  const reportes = await prisma.reporte.findMany({ select: { id: true, tipoDano: true } });
  const antes = new Map<string, number>();
  reportes.forEach(r => antes.set(r.tipoDano ?? 'null', (antes.get(r.tipoDano ?? 'null') ?? 0) + 1));
  console.log('   Antes:', JSON.stringify(Array.from(antes.entries())));

  let cambios = 0;
  for (const r of reportes) {
    const nuevo = mapear(r.tipoDano);
    if (nuevo !== r.tipoDano) {
      await prisma.reporte.update({ where: { id: r.id }, data: { tipoDano: nuevo } });
      cambios++;
    }
  }
  console.log(`   ✅ Reporte: ${cambios}/${reportes.length} actualizados`);

  const trasladosEstado = await prisma.trasladoInstrumentoEstado.findMany({
    where: { tipoDano: { not: null } },
    select: { id: true, tipoDano: true },
  });
  let cambios2 = 0;
  for (const t of trasladosEstado) {
    if (!t.tipoDano) continue;
    const nuevo = mapear(t.tipoDano);
    if (nuevo !== t.tipoDano) {
      await prisma.trasladoInstrumentoEstado.update({ where: { id: t.id }, data: { tipoDano: nuevo } });
      cambios2++;
    }
  }
  console.log(`   ✅ TrasladoInstrumentoEstado: ${cambios2}/${trasladosEstado.length} actualizados`);

  const despues = await prisma.reporte.groupBy({
    by: ['tipoDano'],
    _count: { _all: true },
  });
  console.log('   Después:', despues.map(d => `${d.tipoDano}=${d._count._all}`).join(', '));
  console.log('🌱 Migración completada.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
