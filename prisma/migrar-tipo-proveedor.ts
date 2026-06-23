/**
 * Migración — el campo Proveedor.tipo tenía valores antiguos (Nacional /
 * Internacional) pero el Excel (TM Proveedores) define solo 2 tipos válidos:
 *   Mantenimientos · Compras
 *
 * Esto rompía:
 *  - HojaVida → Crear → dropdown "Proveedor (Compras)" (filtra tipo='Compras')
 *  - Reportes → "Resp. Mantenimiento" (filtra tipo='Mantenimientos')
 *
 * Reasignación por nombre para que ambos dropdowns tengan datos:
 *   Mantenimientos: proveedores de equipos/tecnología
 *   Compras: distribuidoras/importadoras de insumos e instrumental
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const MANTENIMIENTOS = ['Tecnomedical Colombia', 'Equipos y Dispositivos Médicos'];

async function main() {
  const provs = await p.proveedor.findMany({ select: { id: true, nombre: true, tipo: true } });
  let cambios = 0;
  for (const pr of provs) {
    // Si ya es uno de los 2 tipos válidos, no tocar.
    if (pr.tipo === 'Compras' || pr.tipo === 'Mantenimientos') continue;
    const nuevo = MANTENIMIENTOS.includes(pr.nombre) ? 'Mantenimientos' : 'Compras';
    await p.proveedor.update({ where: { id: pr.id }, data: { tipo: nuevo } });
    console.log(`  ${pr.nombre.padEnd(40)} ${pr.tipo} → ${nuevo}`);
    cambios++;
  }
  const compras = await p.proveedor.count({ where: { tipo: 'Compras' } });
  const mant = await p.proveedor.count({ where: { tipo: 'Mantenimientos' } });
  console.log(`\n✅ ${cambios} actualizados. Ahora: Compras=${compras} · Mantenimientos=${mant}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
