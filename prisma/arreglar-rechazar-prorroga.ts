/**
 * Hotfix de datos — los traslados a los que se rechazó la prórroga antes del
 * fix quedaron en estado 'En préstamo' en lugar de 'Vencido'. Esto los deja
 * indistinguibles de un préstamo activo y confunde al admin.
 *
 * No hay forma 100% certera de identificar esos casos a posteriori, pero los
 * traslados 'En préstamo' con fechaDevolucion ya vencida son claros candidatos
 * a Vencido. Los marcamos para que la grilla los muestre con el badge correcto
 * y no aparezcan como préstamos vigentes.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const traslados = await prisma.historialTraslado.findMany({
    where: { estado: 'En préstamo' },
    select: { id: true, fechaDevolucion: true },
  });
  const ahora = Date.now();
  let cambios = 0;
  for (const t of traslados) {
    if (t.fechaDevolucion.getTime() < ahora) {
      await prisma.historialTraslado.update({ where: { id: t.id }, data: { estado: 'Vencido' } });
      cambios++;
    }
  }
  console.log(`✅ ${cambios} traslados En préstamo con fecha pasada → Vencido`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
