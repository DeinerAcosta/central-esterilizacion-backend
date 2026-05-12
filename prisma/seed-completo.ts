/**
 * seed-completo.ts — Datos de prueba realistas para Central de Esterilización
 * Códigos cortos y legibles. Sin prefijos "SEED" en nombres.
 * Idempotente: se puede correr N veces.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const fut  = (d: number): Date => { const x = new Date(); x.setDate(x.getDate() + d); return x; };
const past = (d: number): Date => { const x = new Date(); x.setDate(x.getDate() - d); return x; };
const pad2 = (n: number) => String(n).padStart(2, '0');

// ── Prefijos de códigos cortos ──────────────────────────────
// ESP-01, SUB-01, TS-01, MARC-01, PROV-01, SED-01, QX-01
// USR-01, IQ-01, INS-01, KIT-OF-01

// ── Datos reales ────────────────────────────────────────────
const NOMBRES   = ['Ana','Carlos','María','Juan','Sofía','Diego','Laura','Andrés','Valentina','Miguel'];
const APELLIDOS = ['García','Pérez','López','Rodríguez','Martínez','Hernández','Torres','Ramírez','Flores','Gómez'];
const CIUDADES  = ['Bogotá','Medellín','Cali','Barranquilla','Cartagena','Bucaramanga'];
const PAISES    = ['Colombia','Venezuela','Ecuador','Panamá','México'];
const CARGOS    = ['Jefe de Central','Coordinadora de Enfermería','Auxiliar de Enfermería','Instrumentador Quirúrgico','Técnico en Esterilización'];

const INSTRUMENTOS_NOMBRES = [
  'Pinza de disección sin dientes','Pinza de disección con dientes',
  'Tijera de Mayo recta','Tijera de Metzenbaum curva',
  'Portaagujas Mayo-Hegar','Portaagujas Crile-Wood',
  'Pinza hemostática Mosquito','Pinza hemostática Kelly',
  'Separador Farabeuf','Separador Langenbeck',
  'Retractor de Richardson','Gancho de Senn-Miller',
  'Cureta de Volkmann','Legra de Williger',
  'Pinza de Allis','Pinza de Babcock',
  'Pinza de Foerster','Pinza de Backhaus',
  'Espéculo de Sims','Blefaróstato de Barraquer',
];

const INSUMOS_NOMBRES = [
  'Gasa tejida estéril 10x10 cm','Gasa tejida estéril 7.5x7.5 cm',
  'Apósito transparente 10x12 cm','Vendaje elástico 10 cm',
  'Algodón hidrófilo 500g','Guante quirúrgico látex 6.5',
  'Guante quirúrgico látex 7.0','Guante quirúrgico látex 7.5',
  'Mascarilla N95 con válvula','Jeringa desechable 10 mL',
  'Jeringa desechable 20 mL','Aguja hipodérmica 21G x 1"',
  'Sutura Vicryl 2-0 absorbible','Sutura Nylon 4-0 no absorbible',
  'Sutura PDS 3-0 monofilamento','Bisturí desechable hoja 10',
  'Bisturí desechable hoja 15','Compresas abdominales estériles',
  'Catéter venoso periférico 18G','Campo quirúrgico fenestrado 45x45',
];

const FABRICANTES = ['Karl Storz','B.Braun','Aesculap','Roboz Surgical','Medline Industries'];
const MATERIALES  = ['Acero inoxidable 316L','Titanio grado médico','Carburo de tungsteno'];
const FRECUENCIAS = ['Mensual','Trimestral','Semestral','Anual'];
const QX_NOMBRES  = ['Quirófano Central 1','Quirófano Central 2','Sala de Cirugía A','Sala de Cirugía B','UCI Quirúrgica','Sala de Procedimientos'];

const TIPOS_SELLADO = ['Papel crepé','Papel grado médico','Tela no tejida'];
const TIPOS_EMPAQUE = ['Bolsa mixta papel/polietileno','Contenedor rígido inoxidable','Papel de empaque especial'];
const TIPOS_ESTERIL = ['Autoclave de vapor','Statim 2000S','Óxido de etileno'];
const TIPOS_DANO    = ['Deterioro por uso','Defectuoso de fábrica','Fractura/Partido','Corrosión','Deformación'];

const DESCS_DANO = [
  'El instrumento presenta deformación en la punta que compromete su funcionalidad quirúrgica.',
  'Se detecta corrosión superficial en el mango por ciclos excesivos de esterilización.',
  'La articulación no cierra de manera homogénea, generando riesgo en procedimientos.',
  'Fractura parcial en el extremo distal, requiere reemplazo inmediato.',
  'Desgaste excesivo en el filo de la tijera que impide un corte limpio y preciso.',
];

const DESCS_MANT = [
  'Pulido y afilado profesional completado. Funcionalidad verificada al 100%.',
  'Tratamiento anticorrosivo aplicado. Instrumento enviado a proveedor certificado.',
  'Calibración y ajuste de mecanismo de cierre. Instrumento operativo nuevamente.',
  'Instrumento dado de baja por daño irreparable. Reposición solicitada al proveedor.',
  'Limpieza ultrasónica profunda y reacondicionamiento superficial completados.',
];

// ── Especialidades con subespecialidades y tipos reales ─────
const ESP_DATA = [
  {
    nombre: 'Oftalmología', codigo: 'ESP-01',
    subs: [
      { nombre: 'Cirugía de Catarata', codigo: 'SUB-01', tipos: [{ nombre: 'Básico', codigo: 'TS-01' }, { nombre: 'Avanzado', codigo: 'TS-02' }] },
      { nombre: 'Glaucoma',           codigo: 'SUB-02', tipos: [{ nombre: 'Básico', codigo: 'TS-03' }, { nombre: 'Especializado', codigo: 'TS-04' }] },
    ],
  },
  {
    nombre: 'Ortopedia', codigo: 'ESP-02',
    subs: [
      { nombre: 'Cirugía de Columna',        codigo: 'SUB-03', tipos: [{ nombre: 'Básico', codigo: 'TS-05' }, { nombre: 'Avanzado', codigo: 'TS-06' }] },
      { nombre: 'Artroplastia de Rodilla',   codigo: 'SUB-04', tipos: [{ nombre: 'Avanzado', codigo: 'TS-07' }, { nombre: 'Especializado', codigo: 'TS-08' }] },
    ],
  },
  {
    nombre: 'Cardiología', codigo: 'ESP-03',
    subs: [
      { nombre: 'Cirugía de Válvulas',    codigo: 'SUB-05', tipos: [{ nombre: 'Especializado', codigo: 'TS-09' }] },
      { nombre: 'Ablación de Arritmias', codigo: 'SUB-06', tipos: [{ nombre: 'Avanzado', codigo: 'TS-10' }, { nombre: 'Especializado', codigo: 'TS-11' }] },
    ],
  },
  {
    nombre: 'Neurología', codigo: 'ESP-04',
    subs: [
      { nombre: 'Cirugía de Epilepsia',       codigo: 'SUB-07', tipos: [{ nombre: 'Especializado', codigo: 'TS-12' }] },
      { nombre: 'Neurocirugía de Tumores',    codigo: 'SUB-08', tipos: [{ nombre: 'Avanzado', codigo: 'TS-13' }, { nombre: 'Especializado', codigo: 'TS-14' }] },
    ],
  },
  {
    nombre: 'Otorrinolaringología', codigo: 'ESP-05',
    subs: [
      { nombre: 'Cirugía de Sinusitis', codigo: 'SUB-09', tipos: [{ nombre: 'Básico', codigo: 'TS-15' }, { nombre: 'Avanzado', codigo: 'TS-16' }] },
      { nombre: 'Cirugía de Otitis',   codigo: 'SUB-10', tipos: [{ nombre: 'Básico', codigo: 'TS-17' }] },
    ],
  },
];

const MARCAS_DATA = [
  { codigo: 'MARC-01', nombre: 'Karl Storz' },
  { codigo: 'MARC-02', nombre: 'Alcon Laboratories' },
  { codigo: 'MARC-03', nombre: 'B.Braun Medical' },
  { codigo: 'MARC-04', nombre: 'Medtronic' },
  { codigo: 'MARC-05', nombre: 'Olympus Medical' },
  { codigo: 'MARC-06', nombre: 'Synthes DePuy' },
  { codigo: 'MARC-07', nombre: 'Stryker Corporation' },
  { codigo: 'MARC-08', nombre: 'Roboz Surgical' },
];

const PROV_DATA = [
  { codigo: 'PROV-01', nombre: 'Distribuidora Médica Andina',      nit: '900123456-1', ciudad: 'Bogotá',        pais: 'Colombia',  tipo: 'Nacional' },
  { codigo: 'PROV-02', nombre: 'Importaciones Quirúrgicas Caribe', nit: '900234567-2', ciudad: 'Barranquilla',  pais: 'Colombia',  tipo: 'Nacional' },
  { codigo: 'PROV-03', nombre: 'Suministros Hospitalarios del Pacífico', nit: '900345678-3', ciudad: 'Cali', pais: 'Colombia', tipo: 'Nacional' },
  { codigo: 'PROV-04', nombre: 'Tecnomedical Colombia',            nit: '900456789-4', ciudad: 'Medellín',      pais: 'Colombia',  tipo: 'Nacional' },
  { codigo: 'PROV-05', nombre: 'Instrumental Quirúrgico Nacional', nit: '900567890-5', ciudad: 'Bogotá',        pais: 'Colombia',  tipo: 'Nacional' },
  { codigo: 'PROV-06', nombre: 'Equipos y Dispositivos Médicos',   nit: '900678901-6', ciudad: 'Ciudad de México', pais: 'México', tipo: 'Internacional' },
];

const SEDE_DATA = [
  { nombre: 'Clínica Norte',    ciudad: 'Barranquilla', direccion: 'Cra. 46 #74-50', responsable: 'Ana García' },
  { nombre: 'Clínica Sur',      ciudad: 'Cali',         direccion: 'Av. 6N #28-15',  responsable: 'Carlos Pérez' },
  { nombre: 'Clínica Centro',   ciudad: 'Bogotá',       direccion: 'Cll. 72 #11-35', responsable: 'María López' },
  { nombre: 'Clínica Alkawari', ciudad: 'Medellín',     direccion: 'Cra. 70 #45-20', responsable: 'Juan Rodríguez' },
];

async function main() {
  console.log('🌱 Iniciando seed con datos reales y limpios...\n');

  // ── 0. LIMPIEZA ───────────────────────────────────────────
  console.log('🧹 Limpiando datos previos...');
  // Deshabilitar FK checks en MySQL para poder limpiar en cualquier orden
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  await prisma.historialTraslado.deleteMany({});
  await prisma.escaneoInstrumento.deleteMany({});
  await prisma.insumoCiclo.deleteMany({});
  await prisma.cicloEsterilizacion.deleteMany({});
  await prisma.reporte.deleteMany({});
  await prisma.instrumentoEnKit.deleteMany({});
  await prisma.hojaVidaInstrumento.deleteMany({});
  await prisma.kit.deleteMany({});
  await prisma.insumoQuirurgico.deleteMany({});
  await prisma.quirofano.deleteMany({});
  await prisma.tipoSubespecialidad.deleteMany({});
  await prisma.subespecialidad.deleteMany({});
  await prisma.especialidad.deleteMany({});
  await prisma.marca.deleteMany({});
  await prisma.proveedor.deleteMany({});
  await prisma.sede.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  console.log('   ✅ Limpieza completada\n');

  // ── 1. USUARIOS (10) ──────────────────────────────────────
  console.log('👤 Creando usuarios...');
  const hash  = await bcrypt.hash('Password123!', 10);
  const roles = ['Administrador','Central de esterilización','Operario'];
  const usuarios: Awaited<ReturnType<typeof prisma.usuario.create>>[] = [];

  // ── Admin principal (acceso garantizado) ──────────────────
  const hashAdmin = await bcrypt.hash('Admin123', 10);
  const adminUser = await prisma.usuario.create({
    data: {
      codigo:                'USR-00',
      nombre:                'Central',
      apellido:              'Esterilización',
      empresa:               'Clínica VIU',
      cargo:                 'Administrador del Sistema',
      usuario:               'pruebas.central',
      email:                 'pruebas.central.esterilizacion@gmail.com',
      password:              hashAdmin,
      rol:                   'Administrador',
      esPropietario:         true,
      registroContable:      true,
      esPasswordProvisional: false,
      estado:                true,
      codigoVerificacion:    '1234',
    },
  });
  usuarios.push(adminUser);
  console.log('   🔑 Admin creado: pruebas.central.esterilizacion@gmail.com / Admin123 / PIN: 1234');

  for (let i = 1; i <= 10; i++) {
    const nombre   = NOMBRES[(i - 1) % NOMBRES.length];
    const apellido = APELLIDOS[(i - 1) % APELLIDOS.length];
    const u = await prisma.usuario.create({
      data: {
        codigo:                `USR-${pad2(i)}`,
        nombre,
        apellido,
        empresa:               'Clínica VIU',
        cargo:                 CARGOS[(i - 1) % CARGOS.length],
        usuario:               `${nombre.toLowerCase()}.${apellido.toLowerCase()}${i}`,
        email:                 `${nombre.toLowerCase()}.${apellido.toLowerCase()}${i}@viu.med.co`,
        password:              hash,
        rol:                   roles[(i - 1) % roles.length],
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

  // ── 2. ESPECIALIDADES → SUBS → TIPOS ────────────────────
  console.log('\n🏥 Creando especialidades, subespecialidades y tipos...');
  const especialidades: Awaited<ReturnType<typeof prisma.especialidad.create>>[] = [];
  const subespecialidades: Awaited<ReturnType<typeof prisma.subespecialidad.create>>[] = [];
  const tipos: Awaited<ReturnType<typeof prisma.tipoSubespecialidad.create>>[] = [];

  for (const espDef of ESP_DATA) {
    const e = await prisma.especialidad.create({
      data: { codigo: espDef.codigo, nombre: espDef.nombre, estado: true },
    });
    especialidades.push(e);

    for (const subDef of espDef.subs) {
      const sub: Awaited<ReturnType<typeof prisma.subespecialidad.create>> =
        await prisma.subespecialidad.create({
          data: { codigo: subDef.codigo, nombre: subDef.nombre, estado: true, especialidadId: e.id },
        });
      subespecialidades.push(sub);

      for (const tipoDef of subDef.tipos) {
        const t: Awaited<ReturnType<typeof prisma.tipoSubespecialidad.create>> =
          await prisma.tipoSubespecialidad.create({
            data: { codigo: tipoDef.codigo, nombre: tipoDef.nombre, estado: true, subespecialidadId: sub.id },
          });
        tipos.push(t);
      }
    }
  }
  console.log(`   ✅ ${especialidades.length} esp / ${subespecialidades.length} sub / ${tipos.length} tipos`);

  // ── 3. MARCAS ───────────────────────────────────────────
  console.log('\n🏷️  Creando marcas...');
  const marcas: Awaited<ReturnType<typeof prisma.marca.create>>[] = [];
  for (const md of MARCAS_DATA) {
    const m = await prisma.marca.create({ data: { ...md, estado: true } });
    marcas.push(m);
  }
  console.log(`   ✅ ${marcas.length} marcas`);

  // ── 4. PROVEEDORES ───────────────────────────────────────
  console.log('\n🏢 Creando proveedores...');
  const proveedores: Awaited<ReturnType<typeof prisma.proveedor.create>>[] = [];
  for (const pd of PROV_DATA) {
    const p = await prisma.proveedor.create({ data: { ...pd, estado: true } });
    proveedores.push(p);
  }
  console.log(`   ✅ ${proveedores.length} proveedores`);

  // ── 5. SEDES + QUIRÓFANOS ────────────────────────────────
  console.log('\n🏥 Creando sedes y quirófanos...');
  const sedes: Awaited<ReturnType<typeof prisma.sede.create>>[] = [];
  const quirofanos: Awaited<ReturnType<typeof prisma.quirofano.create>>[] = [];
  let qxIdx = 1;
  for (const sd of SEDE_DATA) {
    const s = await prisma.sede.create({
      data: { nombre: sd.nombre, pais: 'Colombia', ciudad: sd.ciudad, direccion: sd.direccion, responsable: sd.responsable, estado: true },
    });
    sedes.push(s);
    for (let qi = 0; qi < 2; qi++) {
      const q: Awaited<ReturnType<typeof prisma.quirofano.create>> =
        await prisma.quirofano.create({
          data: { codigo: `QX-${pad2(qxIdx)}`, nombre: QX_NOMBRES[(qxIdx - 1) % QX_NOMBRES.length], sedeId: s.id, estado: true },
        });
      quirofanos.push(q);
      qxIdx++;
    }
  }
  console.log(`   ✅ ${sedes.length} sedes / ${quirofanos.length} quirófanos`);

  // ── 6. UNIDADES + PRESENTACIONES + INSUMOS ──────────────
  console.log('\n💊 Creando insumos quirúrgicos...');
  const unidades = await Promise.all(['Unidad','Caja','Rollo','Frasco','Par'].map(n =>
    prisma.unidadMedida.upsert({ where: { nombre: n }, update: {}, create: { nombre: n, estado: true } })
  ));
  const presentaciones = await Promise.all(['Individual','Caja x 10','Caja x 50','Blíster x 5'].map(n =>
    prisma.presentacion.upsert({ where: { nombre: n }, update: {}, create: { nombre: n, estado: true } })
  ));
  const insumosData = INSUMOS_NOMBRES.map((nombre, i) => ({
    codigo:                 `IQ-${pad2(i + 1)}`,
    nombre,
    descripcion:            `${nombre} para procedimientos quirúrgicos estériles`,
    unidadMedidaId:         unidades[i % unidades.length].id,
    presentacionId:         presentaciones[i % presentaciones.length].id,
    proveedorId:            proveedores[i % proveedores.length].id,
    requiereEsterilizacion: i < 12,
    tipoEsterilizacion:     i < 12 ? (['Vapor','Gas','Autoclave'])[i % 3] : null,
    estado:                 true,
  }));
  await prisma.insumoQuirurgico.createMany({ data: insumosData });
  const insumosQx = await prisma.insumoQuirurgico.findMany({ where: { codigo: { startsWith: 'IQ-' } } });
  console.log(`   ✅ ${insumosQx.length} insumos quirúrgicos`);

  // ── 7. INSTRUMENTOS (40) + KITS (10) ────────────────────
  console.log('\n🔧 Creando instrumentos y kits...');
  const propietarios = usuarios.filter(u => u.esPropietario);
  const ESTADOS = ['Habilitado','Habilitado','Habilitado','Esterilizado','Deshabilitado'];

  // Preparar datos de los 40 instrumentos
  const paises = ['Alemania','Estados Unidos','Francia','Suiza','Japón'];
  const esterils = ['Vapor','Gas','Ambas'];
  const instrDataList = Array.from({ length: 40 }, (_, i) => {
    const espIdx = i % especialidades.length;
    const esp    = especialidades[espIdx];
    const subs   = subespecialidades.filter(s => s.especialidadId === esp.id);
    const sub    = subs[i % subs.length];
    const tips   = tipos.filter(t => t.subespecialidadId === sub.id);
    const tip    = tips[i % tips.length];
    const estado = ESTADOS[i % ESTADOS.length];
    return {
      codigo:                  `INS-${pad2(i + 1)}`,
      especialidadId:          esp.id,
      subespecialidadId:       sub.id,
      tipoId:                  tip.id,
      proveedorId:             proveedores[i % proveedores.length].id,
      sedeId:                  sedes[i % sedes.length].id,
      marcaId:                 marcas[i % marcas.length].id,
      nombre:                  INSTRUMENTOS_NOMBRES[i % INSTRUMENTOS_NOMBRES.length],
      fabricante:              FABRICANTES[i % FABRICANTES.length],
      paisOrigen:              paises[i % paises.length],
      numeroSerie:             `SN-${rand(100000, 999999)}-${pad2(i + 1)}`,
      registroInvima:          `INVIMA${rand(2019, 2024)}-${rand(10000, 99999)}-${pad2(i + 1)}`,
      material:                MATERIALES[i % MATERIALES.length],
      esterilizacion:          esterils[i % esterils.length],
      frecuenciaMantenimiento: FRECUENCIAS[i % FRECUENCIAS.length],
      proximoMantenimiento:    fut(rand(30, 365)),
      fechaMantenimientoRef:   past(rand(30, 180)),
      estadoActual:            estado,
      estado,
      cicloEsterilizacion:     rand(0, 50),
      propietarioId:           propietarios[i % propietarios.length].id,
      notasObservaciones:      `Instrumento en buen estado. Revisado el ${past(rand(1,90)).toLocaleDateString('es-CO')}.`,
      referencia:              `REF-${rand(1000, 9999)}`,
    };
  });
  // Insertar en lotes de 10 para no sobrecargar la conexión
  for (let b = 0; b < instrDataList.length; b += 10) {
    await prisma.hojaVidaInstrumento.createMany({ data: instrDataList.slice(b, b + 10) });
  }
  const instrumentos = await prisma.hojaVidaInstrumento.findMany({ where: { codigo: { startsWith: 'INS-' } } });

  // Kits con nombres reales cortos
  const kitDefs = [
    { codigo: 'KIT-OF-01', nombre: 'Kit Catarata Básico',       espIdx: 0, subIdx: 0, tipoNombre: 'Básico' },
    { codigo: 'KIT-OF-02', nombre: 'Kit Catarata Avanzado',     espIdx: 0, subIdx: 0, tipoNombre: 'Avanzado' },
    { codigo: 'KIT-OF-03', nombre: 'Kit Glaucoma Especializado', espIdx: 0, subIdx: 1, tipoNombre: 'Especializado' },
    { codigo: 'KIT-OR-01', nombre: 'Kit Columna Básico',        espIdx: 1, subIdx: 2, tipoNombre: 'Básico' },
    { codigo: 'KIT-OR-02', nombre: 'Kit Rodilla Avanzado',      espIdx: 1, subIdx: 3, tipoNombre: 'Avanzado' },
    { codigo: 'KIT-CA-01', nombre: 'Kit Válvulas Especializado', espIdx: 2, subIdx: 4, tipoNombre: 'Especializado' },
    { codigo: 'KIT-CA-02', nombre: 'Kit Arritmias Avanzado',    espIdx: 2, subIdx: 5, tipoNombre: 'Avanzado' },
    { codigo: 'KIT-NE-01', nombre: 'Kit Epilepsia Especializado',espIdx: 3, subIdx: 6, tipoNombre: 'Especializado' },
    { codigo: 'KIT-OT-01', nombre: 'Kit Sinusitis Básico',      espIdx: 4, subIdx: 8, tipoNombre: 'Básico' },
    { codigo: 'KIT-OT-02', nombre: 'Kit Otitis Básico',         espIdx: 4, subIdx: 9, tipoNombre: 'Básico' },
  ];

  const kits: Awaited<ReturnType<typeof prisma.kit.create>>[] = [];
  for (let i = 0; i < kitDefs.length; i++) {
    const kd   = kitDefs[i];
    const esp  = especialidades[kd.espIdx];
    const sub  = subespecialidades[Math.min(kd.subIdx, subespecialidades.length - 1)];
    const tips = tipos.filter(t => t.subespecialidadId === sub.id);
    const tip  = tips.find(t => t.nombre === kd.tipoNombre) ?? tips[0] ?? tipos[0];

    const kit = await prisma.kit.create({
      data: {
        codigoKit:           kd.codigo,
        nombre:              kd.nombre,
        numeroKit:           i + 1,
        cantidad:            rand(3, 8),
        estado:              'Habilitado',
        especialidadId:      esp.id,
        subespecialidadId:   sub.id,
        tipoSubespecialidad: tip.nombre,
        sedeId:              sedes[i % sedes.length].id,
      },
    });
    kits.push(kit);

    // Asignar 3-4 instrumentos al kit
    const instrKit = instrumentos.filter(ins => ins.especialidadId === esp.id).slice(0, rand(3, 4));
    for (const instr of instrKit) {
      await prisma.instrumentoEnKit.create({ data: { kitId: kit.id, instrumentoId: instr.id } }).catch(() => {});
    }
  }
  console.log(`   ✅ ${instrumentos.length} instrumentos / ${kits.length} kits`);

  // ── 8. CICLOS (50) ────────────────────────────────────────
  console.log('\n⚙️  Creando ciclos...');
  const ciclos: Awaited<ReturnType<typeof prisma.cicloEsterilizacion.create>>[] = [];
  for (let i = 0; i < 30; i++) {
    const dias = rand(1, 90);
    const kit  = kits[i % kits.length];
    const sede = sedes[i % sedes.length];
    const instrsCiclo = instrumentos.slice(i % 10, (i % 10) + rand(2, 4)).map(ins => ({
      instrumentoId: ins.id,
      etapa: 0,
      estadoFisico: Math.random() > 0.8 ? 'Mal estado' : 'Buen estado',
    }));
    const c = await prisma.cicloEsterilizacion.create({
      data: {
        codigoCiclo:           `CIC-ASG-${pad2(i + 1)}`,
        kitId:                 kit.id,
        etapaActual:           6,
        responsableActualId:   usuarios[i % usuarios.length].id,
        tipoSellado:           TIPOS_SELLADO[i % TIPOS_SELLADO.length],
        tipoEmpaque:           TIPOS_EMPAQUE[i % TIPOS_EMPAQUE.length],
        cintaTest:             i % 2 === 0,
        quimicoInterno:        i % 3 === 0,
        lote:                  `LOTE-${rand(1000, 9999)}-${new Date().getFullYear()}`,
        tipoEsterilizacion:    TIPOS_ESTERIL[i % TIPOS_ESTERIL.length],
        autoclaveTipo:         i % 2 === 0 ? 'Vapor saturado' : 'Gas frío',
        valorIndicador:        `${rand(121, 134)}°C`,
        destinoSet:            'Distribución (A Quirófano)',
        sedeDestinoId:         sede.id,
        quirofanoDestino:      QX_NOMBRES[i % QX_NOMBRES.length],
        instrumentadorDestino: `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[i % APELLIDOS.length]}`,
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
    const kit  = kits[(i + 5) % kits.length];
    const sede = sedes[(i + 1) % sedes.length];
    const usaAlmac = i % 3 === 0;
    const instrsCiclo = instrumentos.slice((i + 5) % 10, ((i + 5) % 10) + rand(2, 5)).map(ins => ({
      instrumentoId: ins.id,
      etapa: 5,
      estadoFisico: Math.random() > 0.85 ? 'Mal estado' : 'Buen estado',
    }));
    const c = await prisma.cicloEsterilizacion.create({
      data: {
        codigoCiclo:           `CIC-FIN-${pad2(i + 1)}`,
        kitId:                 kit.id,
        etapaActual:           6,
        responsableActualId:   usuarios[(i + 3) % usuarios.length].id,
        tipoSellado:           TIPOS_SELLADO[i % TIPOS_SELLADO.length],
        tipoEmpaque:           TIPOS_EMPAQUE[i % TIPOS_EMPAQUE.length],
        cintaTest:             i % 2 !== 0,
        quimicoInterno:        i % 2 === 0,
        lote:                  `LOTE-${rand(1000, 9999)}-${new Date().getFullYear()}`,
        tipoEsterilizacion:    TIPOS_ESTERIL[i % TIPOS_ESTERIL.length],
        autoclaveTipo:         i % 2 === 0 ? 'Vapor saturado' : 'Gas frío',
        valorIndicador:        `${rand(121, 134)}°C`,
        destinoSet:            usaAlmac ? 'Almacenamiento (Stock)' : 'Distribución (A Quirófano)',
        sedeDestinoId:         sede.id,
        quirofanoDestino:      usaAlmac ? null : QX_NOMBRES[i % QX_NOMBRES.length],
        instrumentadorDestino: usaAlmac ? null : `${NOMBRES[(i + 2) % NOMBRES.length]} ${APELLIDOS[(i + 2) % APELLIDOS.length]}`,
        almacEstado:           usaAlmac ? 'Disponible' : null,
        almacFechaIngreso:     usaAlmac ? past(rand(1, 30)).toISOString().split('T')[0] : null,
        almacFechaVencimiento: usaAlmac ? fut(rand(30, 180)).toISOString().split('T')[0] : null,
        almacUbicacion:        usaAlmac ? `Estante ${rand(1,10)} - Bandeja ${rand(1,5)}` : null,
        estadoGlobal:          estadosFin[i % estadosFin.length],
        createdAt:             past(dias + 2),
        updatedAt:             past(dias),
        escaneos:              { create: instrsCiclo },
      },
    });
    ciclos.push(c);

    for (const ins of insumosQx.slice(0, rand(2, 4))) {
      await prisma.insumoCiclo.create({
        data: { cicloId: c.id, insumoId: ins.id, cantidad: rand(1, 10) },
      }).catch(() => {});
    }
  }
  console.log(`   ✅ ${ciclos.length} ciclos`);

  // ── 9. REPORTES (17) ─────────────────────────────────────
  console.log('\n📋 Creando reportes...');
  // ✅ Estados válidos del frontend: Pendiente, En curso, Finalizado
  const estadosReporte = ['Pendiente','En curso','En curso','Finalizado'];
  const reportes: Awaited<ReturnType<typeof prisma.reporte.create>>[] = [];
  for (let i = 1; i <= 17; i++) {
    const estado   = estadosReporte[i % estadosReporte.length];
    const provMant = estado !== 'Pendiente' ? proveedores[i % proveedores.length] : null;
    const r = await prisma.reporte.create({
      data: {
        codigo:                   `REP-${pad2(i)}`,
        instrumentoId:            instrumentos[i % instrumentos.length].id,
        tipoDano:                 TIPOS_DANO[i % TIPOS_DANO.length],
        descripcionDano:          DESCS_DANO[i % DESCS_DANO.length],
        reportadoPorId:           usuarios[i % usuarios.length].id,
        proveedorMantenimientoId: provMant?.id ?? null,
        descripcionMantenimiento: estado !== 'Pendiente' ? DESCS_MANT[i % DESCS_MANT.length] : null,
        destinoFinal:             estado === 'Finalizado' ? pick(['Reingreso al inventario','Control de bajas']) : null,
        estado,
        createdAt:                past(rand(1, 120)),
        updatedAt:                past(rand(0, 30)),
      },
    });
    reportes.push(r);
  }
  console.log(`   ✅ ${reportes.length} reportes`);

  // ── 10. TRASLADOS (10) ────────────────────────────────────
  console.log('\n🚚 Creando traslados...');
  let traslados = 0;
  for (let i = 0; i < 10; i++) {
    const origen  = sedes[i % sedes.length];
    const destino = sedes[(i + 1) % sedes.length];
    if (origen.id === destino.id) continue;
    const usaKit = i % 2 === 0;
    await prisma.historialTraslado.create({
      data: {
        instrumentoId:   usaKit ? null : instrumentos[i % instrumentos.length].id,
        kitId:           usaKit ? kits[i % kits.length].id : null,
        sedeOrigenId:    origen.id,
        sedeDestinoId:   destino.id,
        fechaTraslado:   past(rand(10, 90)),
        fechaDevolucion: fut(rand(10, 60)),
        realizadoPor:    'TEST',
      },
    });
    traslados++;
  }
  console.log(`   ✅ ${traslados} traslados`);

  // ── RESUMEN ───────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('✅ SEED COMPLETADO — DATOS REALES Y LIMPIOS');
  console.log('═'.repeat(50));
  console.log(`  Usuarios:          ${usuarios.length}`);
  console.log(`  Especialidades:    ${especialidades.length}`);
  console.log(`  Subespecialidades: ${subespecialidades.length}`);
  console.log(`  Tipos:             ${tipos.length}`);
  console.log(`  Marcas:            ${marcas.length}`);
  console.log(`  Proveedores:       ${proveedores.length}`);
  console.log(`  Sedes:             ${sedes.length}`);
  console.log(`  Quirófanos:        ${quirofanos.length}`);
  console.log(`  Insumos Qx:        ${insumosQx.length}`);
  console.log(`  Instrumentos:      ${instrumentos.length}`);
  console.log(`  Kits:              ${kits.length}`);
  console.log(`  Ciclos:            ${ciclos.length}`);
  console.log(`  Reportes:          ${reportes.length}`);
  console.log(`  Traslados:         ${traslados}`);
  console.log('═'.repeat(50));
  console.log('\nCódigos usados:');
  console.log('  ESP-01..05 | SUB-01..10 | TS-01..17');
  console.log('  MARC-01..08 | PROV-01..06 | SED-01..04 | QX-01..08');
  console.log('  USR-01..10 | IQ-01..20 | INS-01..40');
  console.log('  KIT-OF/OR/CA/NE/OT-01..02 | CIC-ASG/FIN-01.. | REP-01..17');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });