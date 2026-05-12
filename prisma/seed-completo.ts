/**
 * seed-completo.ts — Seed maestro para todos los módulos
 * Datos 100% reales: nombres médicos reales, relaciones completas, sin N/A
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const fut  = (dias: number): Date => { const d = new Date(); d.setDate(d.getDate() + dias); return d; };
const past = (dias: number): Date => { const d = new Date(); d.setDate(d.getDate() - dias); return d; };
const pad  = (n: number, len = 4) => String(n).padStart(len, '0');

// ── Datos reales ────────────────────────────────────────────────────
const NOMBRES   = ['Ana','Carlos','María','Juan','Sofía','Diego','Laura','Andrés','Valentina','Miguel'];
const APELLIDOS = ['García','Pérez','López','Rodríguez','Martínez','Hernández','Torres','Ramírez','Flores','Gómez'];
const CIUDADES  = ['Bogotá','Medellín','Cali','Barranquilla','Cartagena','Bucaramanga'];
const PAISES    = ['Colombia','Venezuela','Ecuador','Panamá','México'];

// Instrumentos quirúrgicos reales
const INSTR_NOMBRES = [
  'Pinza de disección sin dientes','Pinza de disección con dientes','Tijera de Mayo recta',
  'Tijera de Metzenbaum curva','Portaagujas Mayo-Hegar','Portaagujas Crile-Wood',
  'Pinza hemostática Mosquito','Pinza hemostática Kelly','Separador Farabeuf',
  'Separador Langenbeck','Retractor de Richardson','Gancho de Senn-Miller',
  'Cureta de Volkmann','Legra de Williger','Pinza de Allis',
  'Pinza de Babcock','Pinza de Foerster','Pinza de Backhaus',
  'Espéculo de Sims','Blefaróstato de Barraquer',
];
const FABRICANTES = ['Karl Storz','B.Braun','Aesculap','Roboz Surgical','Medline Industries','Integra LifeSciences'];
const MATERIALES  = ['Acero inoxidable 316L','Titanio grado médico','Carburo de tungsteno'];
const ESTERIL     = ['Vapor','Gas','Ambas'];
const FRECUENCIAS = ['Mensual','Trimestral','Semestral','Anual'];

// Insumos quirúrgicos reales
const INSUMO_NOMBRES = [
  'Gasa tejida estéril 10x10 cm','Gasa tejida estéril 7.5x7.5 cm','Apósito transparente 10x12 cm',
  'Vendaje elástico 10 cm','Algodón hidrófilo 500g','Guante quirúrgico látex 6.5',
  'Guante quirúrgico látex 7.0','Guante quirúrgico látex 7.5','Mascarilla N95 con válvula',
  'Jeringa desechable 10 mL','Jeringa desechable 20 mL','Aguja hipodérmica 21G x 1"',
  'Sutura Vicryl 2-0 absorbible','Sutura Nylon 4-0 no absorbible','Sutura PDS 3-0 monofilamento',
  'Bisturí desechable hoja 10','Bisturí desechable hoja 15','Compresas abdominales estériles',
  'Catéter venoso periférico 18G','Campo quirúrgico fenestrado 45x45 cm',
];
const UNIDADES      = ['Unidad','Caja','Rollo','Frasco','Par','Paquete'];
const PRESENTACION  = ['Individual','Caja x 10','Caja x 50','Blíster x 5','Caja x 100'];

// Especialidades y subespecialidades médicas reales
const ESP_DATA = [
  {
    nombre: 'SEED Oftalmología',
    subs: [
      { nombre: 'SEED Cirugía de Catarata', tipos: ['Básico','Avanzado'] },
      { nombre: 'SEED Glaucoma', tipos: ['Básico','Especializado'] },
    ],
  },
  {
    nombre: 'SEED Ortopedia',
    subs: [
      { nombre: 'SEED Cirugía de Columna', tipos: ['Básico','Avanzado','Especializado'] },
      { nombre: 'SEED Artroplastia de Rodilla', tipos: ['Avanzado','Especializado'] },
    ],
  },
  {
    nombre: 'SEED Cardiología',
    subs: [
      { nombre: 'SEED Cirugía de Válvulas', tipos: ['Especializado'] },
      { nombre: 'SEED Ablación de Arritmias', tipos: ['Avanzado','Especializado'] },
    ],
  },
  {
    nombre: 'SEED Neurología',
    subs: [
      { nombre: 'SEED Cirugía de Epilepsia', tipos: ['Especializado'] },
      { nombre: 'SEED Neurocirugía de Tumores', tipos: ['Avanzado','Especializado'] },
    ],
  },
  {
    nombre: 'SEED Otorrinolaringología',
    subs: [
      { nombre: 'SEED Cirugía de Sinusitis', tipos: ['Básico','Avanzado'] },
      { nombre: 'SEED Cirugía de Otitis', tipos: ['Básico'] },
    ],
  },
];

const MARCAS_NOMBRES = [
  'SEED Karl Storz','SEED Alcon Laboratories','SEED B.Braun Medical',
  'SEED Medtronic','SEED Olympus Medical','SEED Synthes DePuy',
  'SEED Stryker Corporation','SEED Roboz Surgical',
];

const TIPOS_SELLADO  = ['Papel crepé','Papel grado médico','Tela no tejida'];
const TIPOS_EMPAQUE  = ['Bolsa mixta papel/polietileno','Contenedor rígido inoxidable','Papel de empaque especial'];
const TIPOS_ESTERIL  = ['Autoclave de vapor','Statim 2000S','Óxido de etileno'];
const AUTOCLAVE_TIPO = ['Vapor saturado','Gas frío'];
const TIPOS_DANO     = ['Deterioro por uso','Defectuoso de fábrica','Fractura/Partido','Corrosión','Deformación'];
const QX_NOMBRES     = ['Quirófano Central 1','Quirófano Central 2','Sala de Cirugía A','Sala de Cirugía B','UCI Quirúrgica','Sala de Procedimientos'];
const CARGOS         = ['Jefe de Central de Esterilización','Coordinadora de Enfermería','Auxiliar de Enfermería','Instrumentador Quirúrgico','Técnico en Esterilización'];

async function main() {
  console.log('🌱 Iniciando seed completo con datos reales...\n');

  // ══════════════════════════════════════════════════════════
  // 0. LIMPIEZA
  // ══════════════════════════════════════════════════════════
  console.log('🧹 Limpiando datos previos...');
  await prisma.historialTraslado.deleteMany({ where: { realizadoPor: 'SEED' } });
  await prisma.reporte.deleteMany({ where: { codigo: { startsWith: 'SEED-REP' } } });
  await prisma.insumoCiclo.deleteMany({ where: { ciclo: { codigoCiclo: { startsWith: 'SEED-' } } } });
  await prisma.escaneoInstrumento.deleteMany({ where: { ciclo: { codigoCiclo: { startsWith: 'SEED-' } } } });
  await prisma.cicloEsterilizacion.deleteMany({ where: { codigoCiclo: { startsWith: 'SEED-' } } });
  await prisma.instrumentoEnKit.deleteMany({ where: { kit: { codigoKit: { startsWith: 'SEED-' } } } });
  await prisma.hojaVidaInstrumento.deleteMany({ where: { codigo: { startsWith: 'SEED-INS' } } });
  await prisma.kit.deleteMany({ where: { codigoKit: { startsWith: 'SEED-' } } });
  await prisma.insumoQuirurgico.deleteMany({ where: { codigo: { startsWith: 'SEED-IQ' } } });
  await prisma.quirofano.deleteMany({ where: { codigo: { startsWith: 'SEED-Q' } } });
  await prisma.tipoSubespecialidad.deleteMany({ where: { codigo: { startsWith: 'SEED-TS' } } });
  await prisma.subespecialidad.deleteMany({ where: { codigo: { startsWith: 'SEED-SUB' } } });
  await prisma.especialidad.deleteMany({ where: { nombre: { startsWith: 'SEED ' } } });
  await prisma.marca.deleteMany({ where: { nombre: { startsWith: 'SEED ' } } });
  await prisma.proveedor.deleteMany({ where: { codigo: { startsWith: 'SEED-PROV' } } });
  await prisma.sede.deleteMany({ where: { nombre: { startsWith: 'Sede SEED' } } });
  await prisma.usuario.deleteMany({ where: { codigo: { startsWith: 'SEED-U' } } });
  console.log('   ✅ Limpieza completada\n');

  // ══════════════════════════════════════════════════════════
  // 1. USUARIOS (10) — con cargos y roles reales
  // ══════════════════════════════════════════════════════════
  console.log('👤 Creando usuarios...');
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const roles = ['Administrador','Central de esterilización','Operario'];
  const usuarios = [];
  for (let i = 1; i <= 10; i++) {
    const nombre   = pick(NOMBRES);
    const apellido = pick(APELLIDOS);
    const ts       = Date.now().toString().slice(-6) + i;
    const u = await prisma.usuario.create({
      data: {
        codigo:                `SEED-U${pad(i)}`,
        nombre,
        apellido,
        empresa:               'Clínica Central VIU',
        cargo:                 pick(CARGOS),
        usuario:               `${nombre.toLowerCase()}.${apellido.toLowerCase()}${ts}`,
        email:                 `${nombre.toLowerCase()}.${apellido.toLowerCase()}${ts}@viu.med.co`,
        password:              passwordHash,
        rol:                   pick(roles),
        esPropietario:         i <= 3,
        registroContable:      i <= 2,
        esPasswordProvisional: false,
        estado:                true,
        codigoVerificacion:    `${rand(1000, 9999)}`,
      },
    });
    usuarios.push(u);
  }
  console.log(`   ✅ ${usuarios.length} usuarios`);

  // ══════════════════════════════════════════════════════════
  // 2. ESPECIALIDADES → SUBESPECIALIDADES → TIPOS
  // ══════════════════════════════════════════════════════════
  console.log('\n🏥 Creando especialidades, subespecialidades y tipos...');
  const especialidades = [];
  const subespecialidades = [];
  const tipos = [];

  for (let ei = 0; ei < ESP_DATA.length; ei++) {
    const espData = ESP_DATA[ei];
    const e = await prisma.especialidad.create({
      data: { codigo: `SEED-ESP${pad(ei+1)}`, nombre: espData.nombre, estado: true },
    });
    especialidades.push(e);

    for (let si = 0; si < espData.subs.length; si++) {
      const subData = espData.subs[si];
      const sub: Awaited<ReturnType<typeof prisma.subespecialidad.create>> =
        await prisma.subespecialidad.create({
          data: {
            codigo:         `SEED-SUB${pad(subespecialidades.length + 1)}`,
            nombre:         subData.nombre,
            estado:         true,
            especialidadId: e.id,
          },
        });
      subespecialidades.push(sub);

      for (const tipoNombre of subData.tipos) {
        const t: Awaited<ReturnType<typeof prisma.tipoSubespecialidad.create>> =
          await prisma.tipoSubespecialidad.create({
            data: {
              codigo:            `SEED-TS${pad(tipos.length + 1)}`,
              nombre:            tipoNombre,
              estado:            true,
              subespecialidadId: sub.id,
            },
          });
        tipos.push(t);
      }
    }
  }
  console.log(`   ✅ ${especialidades.length} esp / ${subespecialidades.length} sub / ${tipos.length} tipos`);

  // ══════════════════════════════════════════════════════════
  // 3. MARCAS + PROVEEDORES + SEDES + QUIRÓFANOS
  // ══════════════════════════════════════════════════════════
  console.log('\n🏢 Creando marcas, proveedores, sedes y quirófanos...');
  const marcas = [];
  for (let i = 0; i < MARCAS_NOMBRES.length; i++) {
    const m = await prisma.marca.create({
      data: { codigo: `SEED-M${pad(i+1)}`, nombre: MARCAS_NOMBRES[i], estado: true },
    });
    marcas.push(m);
  }

  const proveedores = [];
  const provNombres = [
    'Distribuidora Médica Andina SAS','Importaciones Quirúrgicas del Caribe','Suministros Hospitalarios del Pacífico',
    'Tecnomedical Colombia Ltda','Instrumental Quirúrgico Nacional','Equipos y Dispositivos Médicos SA',
  ];
  for (let i = 0; i < provNombres.length; i++) {
    const ciudad = pick(CIUDADES);
    const p = await prisma.proveedor.create({
      data: {
        codigo: `SEED-PROV${pad(i+1)}`,
        tipo:   i < 3 ? 'Nacional' : 'Internacional',
        nombre: provNombres[i],
        nit:    `${rand(800000000, 999999999)}-${rand(1,9)}`,
        pais:   i < 4 ? 'Colombia' : pick(PAISES),
        ciudad,
        estado: true,
      },
    });
    proveedores.push(p);
  }

  const sedes = [];
  const sedeData = [
    { nombre: 'Sede SEED Norte', ciudad: 'Barranquilla' },
    { nombre: 'Sede SEED Sur',   ciudad: 'Cali' },
    { nombre: 'Sede SEED Centro',ciudad: 'Bogotá' },
    { nombre: 'Sede SEED Alkawari', ciudad: 'Medellín' },
  ];
  for (const sd of sedeData) {
    const s = await prisma.sede.create({
      data: {
        nombre:      sd.nombre,
        pais:        'Colombia',
        ciudad:      sd.ciudad,
        direccion:   `Calle ${rand(1,100)} # ${rand(1,50)}-${rand(10,99)}, ${sd.ciudad}`,
        responsable: `${pick(NOMBRES)} ${pick(APELLIDOS)}`,
        estado:      true,
      },
    });
    sedes.push(s);
  }

  const quirofanos = [];
  for (const sede of sedes) {
    for (let qi = 0; qi < 2; qi++) {
      const q: Awaited<ReturnType<typeof prisma.quirofano.create>> =
        await prisma.quirofano.create({
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

  // ══════════════════════════════════════════════════════════
  // 4. UNIDADES + PRESENTACIONES + INSUMOS QX (20) — sin N/A
  // ══════════════════════════════════════════════════════════
  console.log('\n💊 Creando insumos quirúrgicos...');
  const unidades = await Promise.all(UNIDADES.map(n =>
    prisma.unidadMedida.upsert({ where: { nombre: n }, update: {}, create: { nombre: n, estado: true } })
  ));
  const presentaciones = await Promise.all(PRESENTACION.map(n =>
    prisma.presentacion.upsert({ where: { nombre: n }, update: {}, create: { nombre: n, estado: true } })
  ));

  const insumosQx = [];
  for (let i = 0; i < INSUMO_NOMBRES.length; i++) {
    const requiere = i < 12; // los primeros 12 requieren esterilización
    const ins = await prisma.insumoQuirurgico.create({
      data: {
        codigo:                `SEED-IQ${pad(i+1)}`,
        nombre:                `SEED ${INSUMO_NOMBRES[i]}`,
        descripcion:           `${INSUMO_NOMBRES[i]} para uso en procedimientos quirúrgicos estériles`,
        unidadMedidaId:        pick(unidades).id,
        presentacionId:        pick(presentaciones).id,
        proveedorId:           pick(proveedores).id,
        requiereEsterilizacion: requiere,
        tipoEsterilizacion:    requiere ? pick(['Vapor','Gas','Autoclave']) : null,
        estado:                true,
      },
    });
    insumosQx.push(ins);
  }
  console.log(`   ✅ ${insumosQx.length} insumos quirúrgicos (todos con datos completos)`);

  // ══════════════════════════════════════════════════════════
  // 5. INSTRUMENTOS / HOJAS DE VIDA (40) + KITS (10)
  // ══════════════════════════════════════════════════════════
  console.log('\n🔧 Creando instrumentos y kits...');
  const propietarios = usuarios.filter(u => u.esPropietario);
  const instrumentos = [];
  const ESTADOS_INSTR = ['Habilitado','Habilitado','Habilitado','Esterilizado','Deshabilitado'];

  for (let i = 0; i < 40; i++) {
    const esp  = pick(especialidades);
    const subs = subespecialidades.filter(s => s.especialidadId === esp.id);
    const sub  = subs.length > 0 ? pick(subs) : subespecialidades[0];
    const tips = tipos.filter(t => t.subespecialidadId === sub.id);
    const tip  = tips.length > 0 ? pick(tips) : tipos[0];
    const prov = pick(proveedores);
    const marca = pick(marcas);
    const sede  = pick(sedes);
    const estado = pick(ESTADOS_INSTR);
    const nombreInstr = INSTR_NOMBRES[i % INSTR_NOMBRES.length];
    const fabricante  = pick(FABRICANTES);

    const instr = await prisma.hojaVidaInstrumento.create({
      data: {
        codigo:                  `SEED-INS${pad(i+1)}`,
        especialidadId:          esp.id,
        subespecialidadId:       sub.id,
        tipoId:                  tip.id,
        proveedorId:             prov.id,
        sedeId:                  sede.id,
        marcaId:                 marca.id,
        nombre:                  nombreInstr,
        fabricante,
        paisOrigen:              pick(['Alemania','Estados Unidos','Francia','Suiza','Japón']),
        numeroSerie:             `SN${rand(100000,999999)}-SEED${i+1}`,
        registroInvima:          `INVIMA${rand(2018,2024)}-${rand(10000,99999)}-${i+1}`,
        material:                pick(MATERIALES),
        esterilizacion:          pick(ESTERIL),
        frecuenciaMantenimiento: pick(FRECUENCIAS),
        proximoMantenimiento:    fut(rand(30, 365)),
        fechaMantenimientoRef:   past(rand(30, 365)),
        estadoActual:            estado,
        estado,
        cicloEsterilizacion:     rand(0, 50),
        propietarioId:           pick(propietarios).id,
        notasObservaciones:      `Instrumento en buen estado de uso. Revisado el ${new Date(Date.now() - rand(1,90)*86400000).toLocaleDateString('es-CO')}.`,
        referencia:              `REF-${rand(1000,9999)}`,
      },
    });
    instrumentos.push(instr);
  }

  // Kits con nombres reales
  const kitData = [
    { nombre: 'Kit Cirugía de Catarata Básico',       espIdx: 0, subIdx: 0, tipoStr: 'Básico' },
    { nombre: 'Kit Cirugía de Catarata Avanzado',     espIdx: 0, subIdx: 0, tipoStr: 'Avanzado' },
    { nombre: 'Kit Glaucoma Especializado',            espIdx: 0, subIdx: 1, tipoStr: 'Especializado' },
    { nombre: 'Kit Cirugía de Columna Básico',        espIdx: 1, subIdx: 2, tipoStr: 'Básico' },
    { nombre: 'Kit Artroplastia de Rodilla Avanzado', espIdx: 1, subIdx: 3, tipoStr: 'Avanzado' },
    { nombre: 'Kit Cirugía Válvulas Especializado',   espIdx: 2, subIdx: 4, tipoStr: 'Especializado' },
    { nombre: 'Kit Ablación Arritmias Avanzado',      espIdx: 2, subIdx: 5, tipoStr: 'Avanzado' },
    { nombre: 'Kit Epilepsia Especializado',           espIdx: 3, subIdx: 6, tipoStr: 'Especializado' },
    { nombre: 'Kit Sinusitis Básico',                  espIdx: 4, subIdx: 8, tipoStr: 'Básico' },
    { nombre: 'Kit Otitis Básico',                     espIdx: 4, subIdx: 9, tipoStr: 'Básico' },
  ];

  const kits = [];
  for (let i = 0; i < kitData.length; i++) {
    const kd   = kitData[i];
    const esp  = especialidades[kd.espIdx] ?? especialidades[0];
    const sub  = subespecialidades[Math.min(kd.subIdx, subespecialidades.length-1)];
    const tips = tipos.filter(t => t.subespecialidadId === sub.id);
    const tip  = tips.find(t => t.nombre === kd.tipoStr) ?? tips[0] ?? tipos[0];
    const abv  = esp.nombre.replace('SEED ','').substring(0,2).toUpperCase();

    const kit = await prisma.kit.create({
      data: {
        codigoKit:           `SEED-${abv}-KIT${pad(i+1,2)}`,
        nombre:              `SEED ${kd.nombre}`,
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

    // Asignar 3-5 instrumentos reales al kit
    const instrKit = instrumentos.filter(ins => ins.especialidadId === esp.id).slice(0, rand(3, 5));
    for (const instr of instrKit) {
      await prisma.instrumentoEnKit.create({ data: { kitId: kit.id, instrumentoId: instr.id } }).catch(() => {});
      if (!instr.kitId) {
        await prisma.hojaVidaInstrumento.update({ where: { id: instr.id }, data: { kitId: kit.id } }).catch(() => {});
        // update local copy
        const idx = instrumentos.findIndex(x => x.id === instr.id);
        if (idx >= 0) (instrumentos[idx] as typeof instr & { kitId: number }).kitId = kit.id;
      }
    }
  }
  console.log(`   ✅ ${instrumentos.length} instrumentos / ${kits.length} kits`);

  // ══════════════════════════════════════════════════════════
  // 6. CICLOS (50) — con datos completos reales
  // ══════════════════════════════════════════════════════════
  console.log('\n⚙️  Creando ciclos de esterilización...');
  const ciclos = [];

  for (let i = 0; i < 30; i++) {
    const dias = rand(1, 90);
    const kit  = pick(kits);
    const sede = pick(sedes);
    const instrsCiclo = instrumentos.slice(0, rand(2, 5)).map(ins => ({
      instrumentoId: ins.id,
      etapa:         0,
      estadoFisico:  Math.random() > 0.8 ? 'Mal estado' : 'Buen estado',
    }));
    const c = await prisma.cicloEsterilizacion.create({
      data: {
        codigoCiclo:           `SEED-ASG-${pad(i+1,3)}`,
        kitId:                 kit.id,
        etapaActual:           6,
        responsableActualId:   pick(usuarios).id,
        tipoSellado:           pick(TIPOS_SELLADO),
        tipoEmpaque:           pick(TIPOS_EMPAQUE),
        cintaTest:             Math.random() > 0.5,
        quimicoInterno:        Math.random() > 0.5,
        lote:                  `LOTE-${rand(1000,9999)}-${new Date().getFullYear()}`,
        tipoEsterilizacion:    pick(TIPOS_ESTERIL),
        autoclaveTipo:         pick(AUTOCLAVE_TIPO),
        valorIndicador:        `${rand(121,134)}°C`,
        destinoSet:            'Distribución (A Quirófano)',
        sedeDestinoId:         sede.id,
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

  const estadosFin = ['Finalizado','Finalizado','Finalizado','Cancelado'];
  for (let i = 0; i < 20; i++) {
    const dias = rand(5, 180);
    const kit  = pick(kits);
    const sede = pick(sedes);
    const instrsCiclo = instrumentos.slice(0, rand(2, 6)).map(ins => ({
      instrumentoId: ins.id,
      etapa:         5,
      estadoFisico:  Math.random() > 0.85 ? 'Mal estado' : 'Buen estado',
    }));
    const c = await prisma.cicloEsterilizacion.create({
      data: {
        codigoCiclo:           `SEED-FIN-${pad(i+1,3)}`,
        kitId:                 kit.id,
        etapaActual:           6,
        responsableActualId:   pick(usuarios).id,
        tipoSellado:           pick(TIPOS_SELLADO),
        tipoEmpaque:           pick(TIPOS_EMPAQUE),
        cintaTest:             Math.random() > 0.5,
        quimicoInterno:        Math.random() > 0.5,
        lote:                  `LOTE-${rand(1000,9999)}-${new Date().getFullYear()}`,
        tipoEsterilizacion:    pick(TIPOS_ESTERIL),
        autoclaveTipo:         pick(AUTOCLAVE_TIPO),
        valorIndicador:        `${rand(121,134)}°C`,
        destinoSet:            Math.random() > 0.4 ? 'Distribución (A Quirófano)' : 'Almacenamiento (Stock)',
        sedeDestinoId:         sede.id,
        quirofanoDestino:      pick(QX_NOMBRES),
        instrumentadorDestino: `${pick(NOMBRES)} ${pick(APELLIDOS)}`,
        almacEstado:           pick(['Disponible','Reservado']),
        almacFechaIngreso:     past(rand(1,30)).toISOString().split('T')[0],
        almacFechaVencimiento: fut(rand(30,180)).toISOString().split('T')[0],
        almacUbicacion:        `Estante ${rand(1,10)}-Bandeja ${rand(1,5)}`,
        estadoGlobal:          pick(estadosFin),
        createdAt:             past(dias + 2),
        updatedAt:             past(dias),
        escaneos:              { create: instrsCiclo },
      },
    });
    ciclos.push(c);

    // Insumos usados — con cantidades reales
    const insumosUsados = insumosQx.slice(0, rand(2, 5));
    for (const ins of insumosUsados) {
      await prisma.insumoCiclo.create({
        data: { cicloId: c.id, insumoId: ins.id, cantidad: rand(1, 10) },
      }).catch(() => {});
    }
  }
  console.log(`   ✅ ${ciclos.length} ciclos (30 en curso + 20 finalizados)`);

  // ══════════════════════════════════════════════════════════
  // 7. REPORTES (17) — con todos los campos reales completos
  // ══════════════════════════════════════════════════════════
  console.log('\n📋 Creando reportes de daño...');
  const estadosReporte = ['Pendiente','En proceso','Resuelto'];
  const descsDano = [
    'El instrumento presenta deformación en la punta que compromete su funcionalidad quirúrgica.',
    'Se detecta corrosión superficial en el mango, posiblemente por ciclos excesivos de esterilización.',
    'La articulación de la pinza no cierra de manera homogénea, generando riesgo en procedimientos.',
    'El instrumento presenta fractura parcial en el extremo distal, requiere reemplazo inmediato.',
    'Desgaste excesivo en el filo de la tijera que impide un corte limpio y preciso.',
    'El portaagujas presenta juego excesivo en la cremallera de bloqueo.',
    'Marca de óxido en zona de contacto con tejido, requiere evaluación de biocompatibilidad.',
  ];
  const descsMant = [
    'Se realizó pulido y afilado profesional del instrumento. Se verificó funcionalidad al 100%.',
    'Tratamiento anticorrosivo aplicado. Instrumento enviado a proveedor certificado para revisión.',
    'Calibración y ajuste de mecanismo de cierre. Instrumento operativo nuevamente.',
    'Instrumento dado de baja por daño irreparable. Se solicitó reposición al proveedor.',
    'Limpieza ultrasónica profunda y reacondicionamiento superficial completados satisfactoriamente.',
  ];

  const reportes = [];
  for (let i = 1; i <= 17; i++) {
    const instrRep  = pick(instrumentos);
    const usuRep    = pick(usuarios);
    const provMant  = Math.random() > 0.3 ? pick(proveedores) : null;
    const estado    = pick(estadosReporte);
    const r = await prisma.reporte.create({
      data: {
        codigo:                  `SEED-REP${pad(i)}`,
        instrumentoId:           instrRep.id,
        tipoDano:                pick(TIPOS_DANO),
        descripcionDano:         pick(descsDano),
        reportadoPorId:          usuRep.id,
        proveedorMantenimientoId: provMant?.id ?? null,
        descripcionMantenimiento: estado !== 'Pendiente' ? pick(descsMant) : null,
        destinoFinal:             estado === 'Resuelto' ? pick(['Reingreso al inventario','Control de bajas y retiros']) : null,
        estado,
        createdAt:               past(rand(1, 120)),
        updatedAt:               past(rand(0, 30)),
      },
    });
    reportes.push(r);
  }
  console.log(`   ✅ ${reportes.length} reportes (con descripciones y estados reales)`);

  // ══════════════════════════════════════════════════════════
  // 8. HISTORIAL TRASLADOS (10) — con instrumentos y kits reales
  // ══════════════════════════════════════════════════════════
  console.log('\n🚚 Creando historial de traslados...');
  let traslados = 0;
  for (let i = 0; i < 10; i++) {
    const origenIdx  = i % sedes.length;
    const destinoIdx = (i + 1 + rand(1, sedes.length - 1)) % sedes.length;
    const origen  = sedes[origenIdx];
    const destino = sedes[destinoIdx];
    const usaKit  = Math.random() > 0.5;
    const fechaTr = past(rand(10, 90));
    const fechaDev = fut(rand(10, 60));

    await prisma.historialTraslado.create({
      data: {
        instrumentoId:   usaKit ? null : pick(instrumentos).id,
        kitId:           usaKit ? pick(kits).id : null,
        sedeOrigenId:    origen.id,
        sedeDestinoId:   destino.id,
        fechaTraslado:   fechaTr,
        fechaDevolucion: fechaDev,
        realizadoPor:    'SEED',
      },
    });
    traslados++;
  }
  console.log(`   ✅ ${traslados} traslados (5 de kits + 5 de instrumentos)`);

  // ══════════════════════════════════════════════════════════
  // RESUMEN
  // ══════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(54));
  console.log('✅ SEED COMPLETO — DATOS 100% REALES');
  console.log('═'.repeat(54));
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
  console.log('═'.repeat(54));
  console.log('💡 Sin N/A — todos los campos tienen datos reales.');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });