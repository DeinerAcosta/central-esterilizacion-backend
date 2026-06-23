/**
 * Completa datos puntuales para que NINGÚN filtro de la plataforma quede vacío
 * durante la verificación por parte de los interesados.
 *
 * Tras el mapeo de todas las tablas, lo único sin datos era:
 *  - Kit.estado: solo había "Habilitado" → agregamos 2 "Deshabilitado"
 *
 * El resto de tablas y estados ya tienen registros suficientes (ver el
 * documento MAPEO_DATOS_VERIFICACION.md).
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // 2 kits a Deshabilitado para poblar ese filtro (los de mayor id, para no
  // tocar los que más se usan en traslados/ciclos de prueba).
  const kits = await p.kit.findMany({
    where: { estado: 'Habilitado' },
    orderBy: { id: 'desc' },
    take: 2,
    select: { id: true, codigoKit: true },
  });
  for (const k of kits) {
    await p.kit.update({ where: { id: k.id }, data: { estado: 'Deshabilitado' } });
    console.log(`  ${k.codigoKit} → Deshabilitado`);
  }
  console.log(`✅ ${kits.length} kits marcados Deshabilitado`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
