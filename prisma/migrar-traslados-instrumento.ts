/**
 * Migración — para todos los HistorialTraslado de instrumento suelto que
 * no tengan TrasladoInstrumentoEstado asociado, crear uno automáticamente.
 *
 * Estado del nuevo registro:
 *   - "Aprobado" si el traslado ya está en "Recibido"
 *   - "Pendiente" en cualquier otro caso
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Hidratando traslados de instrumento suelto sin estado…');

  const traslados = await prisma.historialTraslado.findMany({
    where: { instrumentoId: { not: null } },
    select: {
      id: true,
      instrumentoId: true,
      estado: true,
      instrumentosEstado: { select: { id: true } },
    },
  });

  let creados = 0;
  for (const t of traslados) {
    if (!t.instrumentoId) continue;
    if (t.instrumentosEstado.length > 0) continue;
    const estadoNuevo = t.estado === 'Recibido' ? 'Aprobado' : 'Pendiente';
    await prisma.trasladoInstrumentoEstado.create({
      data: {
        trasladoId: t.id,
        instrumentoId: t.instrumentoId,
        cantidad: 1,
        estado: estadoNuevo,
      },
    });
    creados++;
  }

  console.log(`   ✅ ${creados} TrasladoInstrumentoEstado creados`);
  console.log('🌱 Migración completada.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
