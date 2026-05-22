import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const past = (dias: number) => new Date(Date.now() - dias * 86_400_000);
const pad2 = (n: number) => String(n).padStart(2, '0');

const PACIENTES = [
  'Felipe Cantillo Lara', 'Pedro Padilla González', 'Ana María Llanos', 'Camila Sotomayor',
  'Luis Fernando Mejía', 'Marta Restrepo Díaz', 'Jorge Iván Cabrera', 'Sofía Vergara Ríos',
  'Andrés Quintero Sáenz', 'Valentina Ospina Cano',
];
const INTERVENCIONES = ['Plástica', 'Catarata', 'Córnea', 'Retina', 'Glaucoma'];
const EQUIPOS = ['Plástico', 'Microcirugía', 'Facoemulsificación', 'Vitrectomía'];

async function main() {
  console.log('🌱 Seed Indicadores (Paquetes + Primera Carga)...');

  // ── Limpieza SOLO de estas dos tablas (no destructivo para el resto) ──
  await prisma.indicadorPaquete.deleteMany({});
  await prisma.indicadorPrimeraCarga.deleteMany({});

  // Kits reales para referenciar su código
  const kits = await prisma.kit.findMany({ select: { codigoKit: true } });
  const kitCodes = kits.length ? kits.map((k) => k.codigoKit) : ['KIT-OF-01', 'KIT-OF-02'];

  // ── Indicador de paquetes e instrumentales (12) ──
  for (let i = 0; i < 12; i++) {
    await prisma.indicadorPaquete.create({
      data: {
        fecha: past(rand(1, 120)),
        nombrePaciente: PACIENTES[i % PACIENTES.length],
        intervencion: pick(INTERVENCIONES),
        quirofano: String(rand(1, 10)),
        equipo: pick(EQUIPOS),
        kit: pick(kitCodes),
        cantidad: rand(1, 3),
        indPaqueteUrl: '/uploads/indicadores/paquete-demo.pdf',
        indInstrumentalUrl: '/uploads/indicadores/instrumental-demo.pdf',
      },
    });
  }
  console.log('   ✅ 12 indicadores de paquetes');

  // ── Indicador de primera carga (10) ──
  for (let i = 0; i < 10; i++) {
    const inicio = rand(6, 10);
    await prisma.indicadorPrimeraCarga.create({
      data: {
        fecha: past(rand(1, 200)),
        lote: `${rand(5000, 5999)}/${rand(1, 3)}`,
        equipo: pick(EQUIPOS),
        instrumental: `Set ${pad2(i + 1)}`,
        temperatura: `${rand(121, 138)}°C`,
        librasPresion: `${rand(28, 32)}lb`,
        horaInicio: `${inicio}:00 am`,
        horaSalida: `${inicio + 1}:20 pm`,
      },
    });
  }
  console.log('   ✅ 10 indicadores de primera carga');

  console.log('🌱 Seed Indicadores completado.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
