import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/**
 * Crea el estado instrumental por traslado (TrasladoInstrumentoEstado) a partir
 * de los instrumentos del kit de cada traslado.
 *  - Recibido            → instrumentos ya validados (Aprobado/Rechazado)
 *  - En préstamo/Vencido → pendientes de validar (Pendiente)
 *  - Otros               → Pendiente
 */
async function main() {
  console.log('🌱 Seed estado instrumental de traslados...');
  await prisma.trasladoInstrumentoEstado.deleteMany({});

  const traslados = await prisma.historialTraslado.findMany({
    where: { kitId: { not: null } },
    include: { kit: { include: { instrumentos: { include: { instrumento: true } } } } },
  });

  let creados = 0;
  for (const t of traslados) {
    const instrumentos = t.kit?.instrumentos ?? [];
    for (const ie of instrumentos) {
      let estado = 'Pendiente';
      if (t.estado === 'Recibido') estado = pick(['Aprobado', 'Aprobado', 'Aprobado', 'Rechazado']);
      await prisma.trasladoInstrumentoEstado.create({
        data: { trasladoId: t.id, instrumentoId: ie.instrumento.id, estado, cantidad: 1 },
      });
      creados++;
    }
  }
  console.log(`   ✅ ${creados} estados instrumentales creados para ${traslados.length} traslados de kit.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
