/**
 * Seed grande para pruebas de Historial de Traslados.
 *
 * Genera ~80 traslados (mitad de kit, mitad de instrumento suelto) con
 * distribución de los 5 estados visibles en la grilla:
 *
 *   Pendiente   (~20%)  → recién solicitados, sin haber sido aprobados
 *   En préstamo (~25%)  → aprobados, fecha devolución futura
 *   Vencido     (~20%)  → fecha de devolución ya pasada (deriva de En préstamo
 *                         o Prórroga vencida)
 *   Prórroga    (~15%)  → se solicitó una prórroga, fecha futura
 *   Recibido    (~20%)  → instrumentos validados al recibirlos
 *
 * Para cada traslado se crea uno o varios TrasladoInstrumentoEstado con el
 * estado base correcto (Pendiente / Aprobado / Rechazado) para que las
 * acciones "Ver aprobado" y "Aprobar recibido" muestren datos reales.
 *
 * NO borra traslados existentes — solo agrega más para pruebas. Si quieres
 * un reset limpio, ejecuta primero un deleteMany sobre HistorialTraslado.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const diasAtras  = (d: number) => new Date(Date.now() - d * 86_400_000);
const diasAdelante = (d: number) => new Date(Date.now() + d * 86_400_000);

interface Plan {
  estadoBase: 'Pendiente' | 'En préstamo' | 'Prórroga' | 'Recibido';
  fechaT: Date;
  fechaD: Date;
  /** Cómo quedan los instrumentos al crear el traslado */
  estadoInstr: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Mixto';
}

/**
 * Devuelve un plan aleatorio según una distribución de probabilidad.
 * El frontend deriva "Vencido" de un En préstamo/Prórroga con fechaD pasada.
 */
const planAleatorio = (): Plan => {
  const r = Math.random();
  if (r < 0.20) {
    // Pendiente
    return {
      estadoBase: 'Pendiente',
      fechaT: diasAtras(rand(0, 5)),
      fechaD: diasAdelante(rand(7, 21)),
      estadoInstr: 'Pendiente',
    };
  }
  if (r < 0.45) {
    // En préstamo
    return {
      estadoBase: 'En préstamo',
      fechaT: diasAtras(rand(5, 25)),
      fechaD: diasAdelante(rand(3, 25)),
      estadoInstr: 'Pendiente',
    };
  }
  if (r < 0.65) {
    // Vencido → estado base "En préstamo" con fechaD pasada
    return {
      estadoBase: 'En préstamo',
      fechaT: diasAtras(rand(30, 90)),
      fechaD: diasAtras(rand(1, 20)),
      estadoInstr: 'Pendiente',
    };
  }
  if (r < 0.80) {
    // Prórroga
    return {
      estadoBase: 'Prórroga',
      fechaT: diasAtras(rand(20, 60)),
      fechaD: diasAdelante(rand(2, 15)),
      estadoInstr: 'Pendiente',
    };
  }
  // Recibido — mezcla de aprobado/rechazado
  return {
    estadoBase: 'Recibido',
    fechaT: diasAtras(rand(30, 120)),
    fechaD: diasAtras(rand(1, 25)),
    estadoInstr: Math.random() < 0.3 ? 'Mixto' : 'Aprobado',
  };
};

const TIPOS_DANO = ['Oxidado', 'Sucio', 'Dañado'];
const DESCS = [
  'Presenta corrosión leve en la punta.',
  'Restos de tejido seco en la articulación.',
  'Fractura parcial en el extremo distal.',
  'Mango con desgaste visible.',
];

async function main() {
  console.log('🌱 Generando traslados de prueba (todos los estados)...');

  // Catálogos disponibles para asignar
  const sedes = await prisma.sede.findMany({ select: { id: true, nombre: true } });
  const kits  = await prisma.kit.findMany({
    select: { id: true, codigoKit: true, hojasDeVida: { select: { id: true } } },
  });
  const instrumentos = await prisma.hojaVidaInstrumento.findMany({
    select: { id: true, kitId: true },
  });

  if (sedes.length < 2) {
    console.error('   ❌ Necesitas al menos 2 sedes en BD.');
    process.exit(1);
  }
  if (kits.length === 0 || instrumentos.length === 0) {
    console.error('   ❌ Necesitas al menos 1 kit y 1 instrumento en BD.');
    process.exit(1);
  }

  const TOTAL = 80;
  const conteoEstados = { Pendiente: 0, 'En préstamo': 0, Prórroga: 0, Recibido: 0, Vencido: 0 };

  for (let i = 0; i < TOTAL; i++) {
    const plan = planAleatorio();

    // Sede origen != Sede destino
    const origen = pick(sedes);
    let destino = pick(sedes);
    while (destino.id === origen.id) destino = pick(sedes);

    // Mitad kit / mitad instrumento suelto
    const esKit = i % 2 === 0;
    const kit = esKit ? pick(kits) : null;
    const instr = !esKit ? pick(instrumentos) : null;

    // Crear traslado
    const traslado = await prisma.historialTraslado.create({
      data: {
        sedeOrigenId:    origen.id,
        sedeDestinoId:   destino.id,
        fechaTraslado:   plan.fechaT,
        fechaDevolucion: plan.fechaD,
        estado:          plan.estadoBase,
        ...(kit   ? { kitId: kit.id }            : {}),
        ...(instr ? { instrumentoId: instr.id }  : {}),
      },
    });

    // Crear TrasladoInstrumentoEstado
    if (kit && kit.hojasDeVida.length > 0) {
      for (const hv of kit.hojasDeVida) {
        const estado = plan.estadoInstr === 'Mixto'
          ? (Math.random() < 0.7 ? 'Aprobado' : 'Rechazado')
          : plan.estadoInstr;
        const esRechazado = estado === 'Rechazado';
        await prisma.trasladoInstrumentoEstado.create({
          data: {
            trasladoId:    traslado.id,
            instrumentoId: hv.id,
            cantidad:      1,
            estado,
            ...(esRechazado ? { tipoDano: pick(TIPOS_DANO), descripcion: pick(DESCS) } : {}),
          },
        });
      }
    } else if (instr) {
      const estado = plan.estadoInstr === 'Mixto'
        ? (Math.random() < 0.7 ? 'Aprobado' : 'Rechazado')
        : plan.estadoInstr;
      const esRechazado = estado === 'Rechazado';
      await prisma.trasladoInstrumentoEstado.create({
        data: {
          trasladoId:    traslado.id,
          instrumentoId: instr.id,
          cantidad:      rand(1, 3),
          estado,
          ...(esRechazado ? { tipoDano: pick(TIPOS_DANO), descripcion: pick(DESCS) } : {}),
        },
      });
    }

    // Conteo (Vencido se deriva en runtime, lo aproximamos aquí)
    const esVencido = plan.fechaD.getTime() < Date.now() && plan.estadoBase !== 'Recibido';
    const etiqueta = esVencido ? 'Vencido' : plan.estadoBase;
    conteoEstados[etiqueta as keyof typeof conteoEstados]++;
  }

  console.log(`   ✅ ${TOTAL} traslados generados`);
  console.log('   Distribución por estado:');
  Object.entries(conteoEstados).forEach(([k, v]) => console.log(`     · ${k.padEnd(12)} ${v}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
