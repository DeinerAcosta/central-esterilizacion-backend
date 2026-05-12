/**
 * seed-completo.ts — Seed maestro para todos los módulos
 *
 * Verificado contra schema.prisma:
 * - Todos los campos @unique usan prefijo "SEED-" para no colisionar con datos reales
 * - Especialidad/Marca usan nombres con prefijo "SEED " para evitar conflictos @unique
 * - HojaVidaInstrumento.estado usa valores válidos del schema
 * - Limpieza idempotente: se puede correr N veces sin errores
 *
 * Uso: npx ts-node prisma/seed-completo.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const fut   = (dias: number): Date => { const d = new Date(); d.setDate(d.getDate() + dias); return d; };
const past  = (dias: number): Date => { const d = new Date(); d.setDate(d.getDate() - dias); return d; };
const pad   = (n: number, len = 4)  => String(n).padStart(len, '0');

const NOMBRES    = ['Ana','Carlos','María','Juan','Sofía','Diego','Laura','Andrés','Valentina','Miguel'];
const APELLIDOS  = ['García','Pérez','López','Rodríguez','Martínez','Hernández','Torres','Ramírez','Flores','Gómez'];
const CIUDADES   = ['Bogotá','Medellín','Cali','Barranquilla','Cartagena','Bucaramanga'];
const PAISES     = ['Colombia','Venezuela','Ecuador','Panamá','México'];
const MATERIALES = ['Titanium','Acero inoxidable','Carburo de tungsteno'];
const ESTERIL    = ['Vapor','Gas','Ambas'];
const FRECUENCIAS = ['Mensual','Trimestral','Semestral','Anual'];
const TIPOS_DANO  = ['Deterioro','Defectuoso','Partido'];
const QX_NOMBRES  = ['Quirófano 1','Quirófano 2','Quirófano 3','Sala A','Sala B','UCI'];
// ✅ FIX: nombres de especialidad/marca con prefijo SEED para no colisionar con @unique reales
const ESP_NOMBRES  = ['SEED Oftalmología','SEED Ortopedia','SEED Cardiología','SEED Neurología','SEED Otorrino'];
const MARCA_NOMBRES = ['SEED Storz','SEED Alcon','SEED B.Braun','SEED Medtronic','SEED Olympus','SEED Synthes','SEED Stryker','SEED Roboz'];
const SUB_NOMBRES = [
  ['SEED Catarata','SEED Glaucoma'],
  ['SEED Columna','SEED Rodilla'],
  ['SEED Válvulas','SEED Arritmias'],
  ['SEED Epilepsia','SEED Tumores'],
  ['SEED Sinusitis','SEED Otitis'],
];
// ✅ FIX: estadoActual usa solo valores válidos del schema
const ESTADOS_INSTR = ['Habilitado','Habilitado','Habilitado','Esterilizado','Deshabilitado'];
const TIPOS_SELLADO = ['Papel crepé','Papel grado médico','Tela'];
const TIPOS_EMPAQUE = ['Bolsa Mixta','Contenedor Rígido','Papel'];
const TIPOS_ESTERIL_CICLO = ['Autoclave','Statim','Óxido de Etileno'];
const AUTOCLAVE_TIPOS = ['Vapor','Gas'];

async function main() {
  console.log('🌱 Iniciando seed completo...\n');

  // ══════════════════════════════════════════════════════
  // 0. LIMPIEZA — orden inverso de dependencias
  // ══════════════════════════════════════════════════════
  console.log('🧹 Limpiando datos de seed previos...');
  await prisma.historialTraslado.deleteMany({ where: { realizadoPor: 'SEED' } });
  await prisma.reporte.deleteMany({ where: { codigo: { startsWith: 'SEED-REP' } } });
  await prisma.insumoCiclo.deleteMany({ where: { ciclo: { codigoCiclo: { startsWith: 'SEED-' } } } });
  await prisma.escaneoInstrumento.deleteMany({ where: { ciclo: { codigoCiclo: { startsWith: 'SEED-' } } } });
  await prisma.cicloEsterilizacion.deleteMany({ where: { codigoCiclo: { startsWith: 'SEED-' } } });
  await prisma.instrumentoEnKit.deleteMany({ where: { kit: { codigoKit: { startsWith: 'SEED-KIT' } } } });
  await prisma.hojaVidaInstrumento.deleteMany({ where: { codigo: { startsWith: 'SEED-INS' } } });
  await prisma.kit.deleteMany({ where: { codigoKit: { startsWith: 'SEED-KIT' } } });
  await prisma.insumoQuirurgico.deleteMany({ where: { codigo: { startsWith: 'SEED-IQ' } } });
  await prisma.quirofano.deleteMany({ where: { codigo: { startsWith: 'SEED-Q' } } });
  await prisma.tipoSubespecialidad.deleteMany({ where: { codigo: { startsWith: 'SEED-TS' } } });
  await prisma.subespecialidad.deleteMany({ where: { codigo: { startsWith: 'SEED-SUB' } } });
  // ✅ FIX: limpiar especialidades/marcas por nombre con prefijo SEED (porque nombre es @unique)
  await prisma.especialidad.deleteMany({ where: { nombre: { startsWith: 'SEED ' } } });
  await prisma.marca.deleteMany({ where: { nombre: { startsWith: 'SEED ' } } });
  await prisma.proveedor.deleteMany({ where: { codigo: { startsWith: 'SEED-PROV' } } });
  await prisma.sede.deleteMany({ where: { nombre: { startsWith: 'Sede SEED' } } });
  await prisma.usuario.deleteMany({ where: { codigo: { startsWith: 'SEED-U' } } });
  console.log('   ✅ Limpieza completada\n');

  // ══════════════════════════════════════════════════════
  // 1. USUARIOS (10)
  // ══════════════════════════════════════════════════════
  console.log('👤 Creando usuarios...');
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const roles = ['Administrador','Central de esterilización','Operario'];
  const usuarios = [];
  for (let i = 1; i <= 10; i++) {
    const u = await prisma.usuario.create({
      data: {
        codigo:                `SEED-U${pad(i)}`,
        nombre:                pick(NOMBRES),
        apellido:              pick(APELLIDOS),
        empresa:               'VIU',
        cargo:                 pick(['Administrador General','Coordinador SST','Enfermera Jefe','Auxiliar']),
        usuario:               `seed_u${i}_${Date.now().toString().slice(-4)}`,
        email:                 `seed.u${i}.${Date.now().toString().slice(-4)}@test.local`,
        password:              passwordHash,
        rol:                   pick(roles),
        esPropietario:         i <= 3,
        registroContable:      i <= 2,
        esPasswordProvisional: false,
        estado:                true,
        codigoVerificacion:    `${rand(1000,9999)}`,
      },
    });
    usuarios.push(u);
  }
  console.log(`   ✅ ${usuarios.length} usuarios`);

  // ══════════════════════════════════════════════════════
  // 2. ESPECIALIDADES → SUBESPECIALIDADES → TIPOS
  // ══════════════════════════════════════════════════════
  console.log('\n🏥 Creando especialidades, subespecialidades y tipos...');
  const especialidades = [];
  for (let i = 0; i < ESP_NOMBRES.length; i++) {
    const e = await prisma.especialidad.create({
      data: { codigo: `SEED-ESP${pad(i+1)}`, nombre: ESP_NOMBRES[i], estado: true },
    });
    especialidades.push(e);
  }

  const subespecialidades = [];
  for (let ei = 0; ei < especialidades.length; ei++) {
    for (let si = 0; si < SUB_NOMBRES[ei].length; si++) {
      const sub: Awaited<ReturnType<typeof prisma.subespecialidad.create>> = await prisma.subespecialidad.create({
        data: {
          codigo:         `SEED-SUB${pad(subespecialidades.length + 1)}`,
          nombre:         SUB_NOMBRES[ei][si],   // ✅ campo es "nombre" en schema
          estado:         true,
          especialidadId: especialidades[ei].id,
        },
      });
      subespecialidades.push(sub);
    }
  }

  const tipos = [];
  const tipoNombres = ['Básico','Avanzado','Especializado','Pediátrico'];
  for (const sub of subespecialidades) {
    const count = rand(1, 2);
    for (let ti = 0; ti < count; ti++) {
      const t: Awaited<ReturnType<typeof prisma.tipoSubespecialidad.create>> = await prisma.tipoSubespecialidad.create({
        data: {
          codigo:            `SEED-TS${pad(tipos.length + 1)}`,
          nombre:            pick(tipoNombres),
          estado:            true,
          subespecialidadId: sub.id,
        },
      });
      tipos.push(t);
    }
  }
  console.log(`   ✅ ${especialidades.length} esp / ${subespecialidades.length} sub / ${tipos.length} tipos`);

  // ══════════════════════════════════════════════════════
  // 3. MARCAS + PROVEEDORES + SEDES + QUIRÓFANOS
  // ══════════════════════════════════════════════════════
  console.log('\n🏢 Creando marcas, proveedores, sedes y quirófanos...');
  const marcas = [];
  for (let i = 0; i < MARCA_NOMBRES.length; i++) {
    const m = await prisma.marca.create({
      data: { codigo: `SEED-M${pad(i+1)}`, nombre: MARCA_NOMBRES[i], estado: true },
    });
    marcas.push(m);
  }

  const proveedores = [];
  for (let i = 1; i <= 6; i++) {
    const p = await prisma.proveedor.create({
      data: {
        codigo: `SEED-PROV${pad(i)}`,
        tipo:   pick(['Nacional','Internacional']),
        nombre: `Distribuidora Médica SEED ${i}`,
        nit:    `9${rand(10000000,99999999)}-${rand(1,9)}`,
        pais:   pick(PAISES),
        ciudad: pick(CIUDADES),
        estado: true,
      },
    });
    proveedores.push(p);
  }

  const sedes = [];
  const sedeNoms = ['Sede SEED Norte','Sede SEED Sur','Sede SEED Centro','Sede SEED Alkawari'];
  for (const nom of sedeNoms) {
    const s = await prisma.sede.create({
      data: {
        nombre:      nom,
        pais:        'Colombia',
        ciudad:      pick(CIUDADES),
        direccion:   `Calle ${rand(1,100)} # ${rand(1,50)}-${rand(1,99)}`,
        responsable: `${pick(NOMBRES)} ${pick(APELLIDOS)}`,
        estado:      true,
      },
    });
    sedes.push(s);
  }

  const quirofanos = [];
  for (const sede of sedes) {
    for (let qi = 0; qi < 2; qi++) {
      const q: Awaited<ReturnType<typeof prisma.quirofano.create>> = await prisma.quirofano.create({
        data: {
          codigo: `SEED-Q${pad(quirofanos.length + 1)}`,
          nombre: QX_NOMBRES[quirofanos.length % QX_NOMBRES.length],
          sedeId: sede.id,
          estado: true,
        },
      });
      quirofanos.push(q);
    }
  }
  console.log(`   ✅ ${marcas.length} marcas / ${proveedores.length} prov / ${sedes.length} sedes / ${quirofanos.length} qx`);

  // ══════════════════════════════════════════════════════
  // 4. UNIDADES + PRESENTACIONES + INSUMOS QX (20)
  // ══════════════════════════════════════════════════════
  console.log('\n💊 Creando insumos quirúrgicos...');
  // upsert para no duplicar si ya existen
  const unidades = await Promise.all(['Unidad','Caja','Rollo','Frasco'].map(n =>
    prisma.unidadMedida.upsert({ where: { nombre: n }, update: {}, create: { nombre: n, estado: true } })
  ));
  const presentaciones = await Promise.all(['Individual','Caja x 10','Caja x 50','Blíster'].map(n =>
    prisma.presentacion.upsert({ where: { nombre: n }, update: {}, create: { nombre: n, estado: true } })
  ));

  const insNombres = [
    'SEED Gasa 10x10','SEED Algodón hidrófilo','SEED Vendaje elástico',
    'SEED Guante 7.5','SEED Guante 8.0','SEED Mascarilla N95',
    'SEED Jeringa 10ml','SEED Jeringa 20ml','SEED Aguja 21G',
    'SEED Sutura Vicryl 2-0','SEED Sutura Nylon 4-0','SEED Hilo monofilamento',
    'SEED Bisturí 10','SEED Bisturí 15','SEED Tijera Metzenbaum',
    'SEED Pinza Kelly','SEED Pinza Allis','SEED Separador Farabeuf',
    'SEED Compresas abdominales','SEED Apósito transparente',
  ];

  const insumosQx = [];
  for (let i = 0; i < insNombres.length; i++) {
    const ins = await prisma.insumoQuirurgico.create({
      data: {
        codigo:                 `SEED-IQ${pad(i+1)}`,
        nombre:                 insNombres[i],
        descripcion:            `Insumo de prueba seed: ${insNombres[i]}`,
        unidadMedidaId:         pick(unidades).id,
        presentacionId:         pick(presentaciones).id,
        proveedorId:            pick(proveedores).id,
        requiereEsterilizacion: i < 10,
        tipoEsterilizacion:     i < 10 ? pick(['Gas','Vapor']) : null,
        estado:                 true,
      },
    });
    insumosQx.push(ins);
  }
  console.log(`   ✅ ${insumosQx.length} insumos quirúrgicos`);

  // ══════════════════════════════════════════════════════
  // 5. INSTRUMENTOS / HOJAS DE VIDA (40) + KITS (10)
  // ══════════════════════════════════════════════════════
  console.log('\n🔧 Creando instrumentos y kits...');
  const instrNombres = [
    'Pinza de disección','Tijera de Mayo','Separador Langenbeck',
    'Porta-agujas Mayo-Hegar','Pinza Mosquito','Bisturí Mango 4',
    'Legra de Williger','Cureta de Volkmann','Retractor de Richardson',
    'Gancho de Senn','Pinza Backhaus','Portaagujas Crile-Wood',
    'Tijera Metzenbaum','Pinza Allis','Espejo laríngeo',
    'Pinza de Klemmer','Separador de Weitlaner','Pinza Foerster',
    'Cureta uterina','Espéculo de Sims',
  ];

  const propietarios = usuarios.filter(u => u.esPropietario);
  const instrumentos = [];

  for (let i = 0; i < 40; i++) {
    const esp  = pick(especialidades);
    const subs = subespecialidades.filter(s => s.especialidadId === esp.id);
    const sub  = subs.length > 0 ? pick(subs) : subespecialidades[0];
    const tips = tipos.filter(t => t.subespecialidadId === sub.id);
    const tip  = tips.length > 0 ? pick(tips) : tipos[0];

    const instr = await prisma.hojaVidaInstrumento.create({
      data: {
        codigo:                  `SEED-INS${pad(i+1)}`,
        especialidadId:          esp.id,
        subespecialidadId:       sub.id,
        tipoId:                  tip.id,
        proveedorId:             pick(proveedores).id,
        sedeId:                  pick(sedes).id,
        marcaId:                 pick(marcas).id,
        nombre:                  instrNombres[i % instrNombres.length],
        fabricante:              pick(['Storz','Aesculap','B.Braun','Roboz','Medline']),
        paisOrigen:              pick(PAISES),
        numeroSerie:             `SN-SEED-${rand(100000,999999)}-${i}`,
        registroInvima:          `INVIMA-SEED-${rand(10000,99999)}-${i}`,
        material:                pick(MATERIALES),
        esterilizacion:          pick(ESTERIL),
        frecuenciaMantenimiento: pick(FRECUENCIAS),
        proximoMantenimiento:    fut(rand(30, 365)),
        // ✅ FIX: estadoActual usa valores válidos del schema String
        estadoActual:            pick(ESTADOS_INSTR),
        // ✅ FIX: campo "estado" también es String en schema
        estado:                  pick(['Habilitado','Habilitado','Habilitado','Deshabilitado']),
        cicloEsterilizacion:     rand(0, 50),
        propietarioId:           pick(propietarios).id,
      },
    });
    instrumentos.push(instr);
  }

  const kits = [];
  for (let i = 0; i < 10; i++) {
    const esp  = especialidades[i % especialidades.length];
    const subs = subespecialidades.filter(s => s.especialidadId === esp.id);
    const sub  = subs.length > 0 ? subs[0] : subespecialidades[0];
    const tips = tipos.filter(t => t.subespecialidadId === sub.id);
    const tip  = tips.length > 0 ? tips[0] : tipos[0];

    const kit = await prisma.kit.create({
      data: {
        codigoKit:           `SEED-KIT-${esp.nombre.replace('SEED ','').substring(0,2).toUpperCase()}${pad(i+1,2)}`,
        nombre:              `SEED Kit ${esp.nombre.replace('SEED ','')} ${i+1}`,
        numeroKit:           i + 1,
        cantidad:            rand(3, 8),
        estado:              'Habilitado',
        especialidadId:      esp.id,
        subespecialidadId:   sub.id,
        tipoSubespecialidad: tip.nombre,
        sedeId:              pick(sedes).id,
      },
    });
    kits.push(kit);

    // Asignar 3-5 instrumentos al kit
    const instrKit = instrumentos
      .filter(ins => ins.especialidadId === esp.id)
      .slice(0, rand(3, 5));

    for (const instr of instrKit) {
      await prisma.instrumentoEnKit.create({
        data: { kitId: kit.id, instrumentoId: instr.id },
      }).catch(() => {}); // ignorar duplicado si se asignó en otro kit

      await prisma.hojaVidaInstrumento.update({
        where: { id: instr.id },
        data:  { kitId: kit.id },
      }).catch(() => {});
    }
  }
  console.log(`   ✅ ${instrumentos.length} instrumentos / ${kits.length} kits`);

  // ══════════════════════════════════════════════════════
  // 6. CICLOS (50) — 30 asignaciones + 20 finalizados
  // ══════════════════════════════════════════════════════
  console.log('\n⚙️  Creando ciclos de esterilización...');
  const ciclos = [];

  for (let i = 0; i < 30; i++) {
    const dias = rand(1, 90);
    const instrsCiclo = instrumentos.slice(0, rand(2, 5)).map(ins => ({
      instrumentoId: ins.id,
      etapa:         0,
      estadoFisico:  Math.random() > 0.8 ? 'Mal estado' : 'Buen estado',
    }));
    const c = await prisma.cicloEsterilizacion.create({
      data: {
        codigoCiclo:           `SEED-ASG-${pad(i+1,3)}`,
        kitId:                 pick(kits).id,
        etapaActual:           6,
        responsableActualId:   pick(usuarios).id,
        tipoSellado:           pick(TIPOS_SELLADO),
        tipoEmpaque:           pick(TIPOS_EMPAQUE),
        cintaTest:             Math.random() > 0.5,
        quimicoInterno:        Math.random() > 0.5,
        lote:                  `L${rand(1000,9999)}`,
        tipoEsterilizacion:    pick(TIPOS_ESTERIL_CICLO),
        autoclaveTipo:         pick(AUTOCLAVE_TIPOS),
        valorIndicador:        String(rand(121,134)),
        destinoSet:            'Distribución (A Quirófano)',
        sedeDestinoId:         pick(sedes).id,
        quirofanoDestino:      pick(QX_NOMBRES),
        instrumentadorDestino: `${pick(NOMBRES)} ${pick(APELLIDOS)}`,
        estadoGlobal:          'En Curso',
        createdAt:             past(dias + 1),
        updatedAt:             past(dias),
        escaneos:              { create: instrsCiclo },
      },
    });
    ciclos.push(c);
  }

  const estadosCicloFin = ['Finalizado','Entregado','Cancelado'];
  for (let i = 0; i < 20; i++) {
    const dias = rand(5, 180);
    const instrsCiclo = instrumentos.slice(0, rand(2, 6)).map(ins => ({
      instrumentoId: ins.id,
      etapa:         5,
      estadoFisico:  Math.random() > 0.85 ? 'Mal estado' : 'Buen estado',
    }));
    const c = await prisma.cicloEsterilizacion.create({
      data: {
        codigoCiclo:           `SEED-FIN-${pad(i+1,3)}`,
        kitId:                 pick(kits).id,
        etapaActual:           6,
        responsableActualId:   pick(usuarios).id,
        tipoSellado:           pick(TIPOS_SELLADO),
        tipoEmpaque:           pick(TIPOS_EMPAQUE),
        cintaTest:             Math.random() > 0.5,
        quimicoInterno:        Math.random() > 0.5,
        lote:                  `L${rand(1000,9999)}`,
        tipoEsterilizacion:    pick(TIPOS_ESTERIL_CICLO),
        autoclaveTipo:         pick(AUTOCLAVE_TIPOS),
        valorIndicador:        String(rand(121,134)),
        destinoSet:            'Distribución (A Quirófano)',
        sedeDestinoId:         pick(sedes).id,
        quirofanoDestino:      pick(QX_NOMBRES),
        instrumentadorDestino: `${pick(NOMBRES)} ${pick(APELLIDOS)}`,
        estadoGlobal:          pick(estadosCicloFin),
        createdAt:             past(dias + 2),
        updatedAt:             past(dias),
        escaneos:              { create: instrsCiclo },
      },
    });
    ciclos.push(c);

    // Insumos usados en el ciclo
    for (const ins of insumosQx.slice(0, rand(1, 4))) {
      await prisma.insumoCiclo.create({
        data: { cicloId: c.id, insumoId: ins.id, cantidad: rand(1, 10) },
      }).catch(() => {});
    }
  }
  console.log(`   ✅ ${ciclos.length} ciclos (30 asignaciones + 20 finalizados)`);

  // ══════════════════════════════════════════════════════
  // 7. REPORTES (15)
  // ══════════════════════════════════════════════════════
  console.log('\n📋 Creando reportes de daño...');
  const reportes = [];
  for (let i = 1; i <= 15; i++) {
    const r = await prisma.reporte.create({
      data: {
        codigo:                  `SEED-REP${pad(i)}`,
        instrumentoId:           pick(instrumentos).id,
        tipoDano:                pick(TIPOS_DANO),
        descripcionDano:         `Daño de prueba #${i}: instrumento requiere revisión`,
        reportadoPorId:          pick(usuarios).id,
        proveedorMantenimientoId: Math.random() > 0.5 ? pick(proveedores).id : null,
        descripcionMantenimiento: Math.random() > 0.5 ? `Mantenimiento correctivo #${i}` : null,
        destinoFinal:             pick(['Reparación','Baja','En revisión', null]) as string | null,
        estado:                   pick(['Pendiente','En proceso','Resuelto']),
      },
    });
    reportes.push(r);
  }
  console.log(`   ✅ ${reportes.length} reportes`);

  // ══════════════════════════════════════════════════════
  // 8. HISTORIAL TRASLADOS (8)
  // ══════════════════════════════════════════════════════
  console.log('\n🚚 Creando historial de traslados...');
  let traslados = 0;
  for (let i = 0; i < 8; i++) {
    const origen  = sedes[i % sedes.length];
    const destino = sedes[(i + 1) % sedes.length];
    if (origen.id === destino.id) continue;
    await prisma.historialTraslado.create({
      data: {
        instrumentoId:   Math.random() > 0.5 ? pick(instrumentos).id : null,
        kitId:           Math.random() > 0.5 ? pick(kits).id : null,
        sedeOrigenId:    origen.id,
        sedeDestinoId:   destino.id,
        fechaTraslado:   past(rand(1, 60)),
        fechaDevolucion: fut(rand(1, 30)),
        realizadoPor:    'SEED',
      },
    });
    traslados++;
  }
  console.log(`   ✅ ${traslados} traslados`);

  // ══════════════════════════════════════════════════════
  // RESUMEN
  // ══════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(52));
  console.log('✅ SEED COMPLETO FINALIZADO');
  console.log('═'.repeat(52));
  console.log(`  Usuarios:            ${usuarios.length}`);
  console.log(`  Especialidades:      ${especialidades.length}`);
  console.log(`  Subespecialidades:   ${subespecialidades.length}`);
  console.log(`  Tipos sub.:          ${tipos.length}`);
  console.log(`  Marcas:              ${marcas.length}`);
  console.log(`  Proveedores:         ${proveedores.length}`);
  console.log(`  Sedes:               ${sedes.length}`);
  console.log(`  Quirófanos:          ${quirofanos.length}`);
  console.log(`  Insumos Qx:          ${insumosQx.length}`);
  console.log(`  Instrumentos (HV):   ${instrumentos.length}`);
  console.log(`  Kits:                ${kits.length}`);
  console.log(`  Ciclos:              ${ciclos.length}`);
  console.log(`  Reportes:            ${reportes.length}`);
  console.log(`  Traslados:           ${traslados}`);
  console.log('═'.repeat(52));
  console.log('💡 Idempotente: corre de nuevo para resetear datos de prueba.');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });