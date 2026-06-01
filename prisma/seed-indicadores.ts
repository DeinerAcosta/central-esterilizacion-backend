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
const OFTALMOLOGOS = [
  'Juan Gallardo Torres', 'Laura Restrepo Vélez', 'Carlos Mendoza Pérez', 'Diana Ríos Acosta',
  'Ricardo Salcedo Mora', 'Paula Andrea Gómez',
];
const INSTRUMENTADORES = [
  'Michel Jiménez Martínez', 'Sara Beltrán Ruiz', 'Andrés Felipe Cano', 'Karen Vargas León',
  'Mónica Lozano Díaz', 'Esteban Quintana Ruiz',
];
const RESPONSABLES = [
  'Felipe Cantillo Lara', 'Pedro Padilla Gonzáles', 'Ana Maria Llanos Trespalacios',
  'Camila Sotomayor Pedraza', 'Rubén Torres Gutierrez', 'Ernesto Cárdenas Fernandez',
];
const INTERVENCIONES = ['Plástica', 'Catarata', 'Córnea', 'Retina', 'Glaucoma'];
const EQUIPOS = ['Plástico', 'Microcirugía', 'Facoemulsificación', 'Vitrectomía'];
const EQUIPOS_PRIMERA_CARGA = ['Statim', 'Autoclave']; // El form solo permite estos dos
const QUIROFANOS = ['Heiss Gmb & Co.', 'Quirófano 1', 'Quirófano 2', 'Quirófano 3', 'Quirófano 4'];

async function main() {
  console.log('🌱 Seed Indicadores (Paquetes + Primera Carga)...');

  // ── Limpieza SOLO de estas dos tablas (no destructivo para el resto) ──
  await prisma.indicadorPaquete.deleteMany({});
  await prisma.indicadorPrimeraCarga.deleteMany({});

  // Kits reales para referenciar su código
  const kits = await prisma.kit.findMany({ select: { codigoKit: true } });
  const kitCodes = kits.length ? kits.map((k) => k.codigoKit) : ['KIT-OF-01', 'KIT-OF-02'];

  // Usuarios reales para asignar como responsable
  const usuarios = await prisma.usuario.findMany({ select: { id: true }, take: 20 });
  const usuariosIds = usuarios.map((u) => u.id);

  // ── Indicador de paquetes e instrumentales (12) ──
  for (let i = 0; i < 12; i++) {
    const h = rand(7, 16);
    const ampm = h < 12 ? 'am' : 'pm';
    const h12 = h <= 12 ? h : h - 12;
    await prisma.indicadorPaquete.create({
      data: {
        fecha: past(rand(1, 120)),
        hora: `${pad2(h12)}:${pick(['00', '15', '30', '45'])}${ampm}`,
        codigo: String(rand(2000, 7999)),
        nombrePaciente: PACIENTES[i % PACIENTES.length],
        nombreOftalmologo: pick(OFTALMOLOGOS),
        nombreInstrumentador: pick(INSTRUMENTADORES),
        responsable: RESPONSABLES[i % RESPONSABLES.length],
        intervencion: pick(INTERVENCIONES),
        quirofano: pick(QUIROFANOS),
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
  // El form acepta múltiples kits → guardamos varios códigos separados por coma
  for (let i = 0; i < 10; i++) {
    const inicio = rand(6, 10);
    // 1 a 4 kits aleatorios sin repetir
    const cantidadKits = rand(1, Math.min(4, kitCodes.length));
    const kitsUnicos: string[] = [];
    while (kitsUnicos.length < cantidadKits) {
      const k = pick(kitCodes);
      if (!kitsUnicos.includes(k)) kitsUnicos.push(k);
    }
    await prisma.indicadorPrimeraCarga.create({
      data: {
        fecha: past(rand(1, 200)),
        lote: `${rand(5000, 5999)}/${rand(1, 3)}`,
        equipo: pick(EQUIPOS_PRIMERA_CARGA),
        instrumental: kitsUnicos.join(', '),
        temperatura: `${rand(121, 138)}°C`,
        librasPresion: `${rand(28, 32)}lb`,
        horaInicio: `${inicio}:00 am`,
        horaSalida: `${inicio + 1}:20 pm`,
        ...(usuariosIds.length ? { responsableId: pick(usuariosIds) } : {}),
      },
    });
  }
  console.log('   ✅ 10 indicadores de primera carga');

  console.log('🌱 Seed Indicadores completado.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
