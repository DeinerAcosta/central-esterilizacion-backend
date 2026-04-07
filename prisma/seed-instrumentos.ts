import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando inyección de datos para Pinza Relojero GUSOR (OFGLPO0004)...');

  // 1. Obtener al usuario Administrador
  const admin = await prisma.usuario.findFirst({ where: { email: 'pruebas.central.esterilizacion@gmail.com' } });
  
  if (!admin) {
    console.error('❌ Error: No se encontró el usuario admin. Corre primero el seed de usuarios.');
    return;
  }

  // 2. Crear Catálogos Base
  const especialidad = await prisma.especialidad.upsert({
    where: { codigo: 'ESP-OFT' },
    update: {},
    create: { codigo: 'ESP-OFT', nombre: 'Oftalmología' }
  });

  const subespecialidad = await prisma.subespecialidad.upsert({
    where: { codigo: 'SUB-COR' },
    update: {},
    create: { codigo: 'SUB-COR', nombre: 'Córnea', especialidadId: especialidad.id }
  });

  const tipoSub = await prisma.tipoSubespecialidad.upsert({
    where: { codigo: 'TIP-MIC' },
    update: {},
    create: { codigo: 'TIP-MIC', nombre: 'Microcirugía', subespecialidadId: subespecialidad.id }
  });

  const proveedor = await prisma.proveedor.upsert({
    where: { nit: '800192345' },
    update: {},
    create: { codigo: 'PROV-MED', tipo: 'Nacional', nombre: 'Medical Instruments SAS', nit: '800192345', pais: 'Colombia', ciudad: 'Bogotá' }
  });

  // ✅ NUEVO: Crear la Marca GUSOR en tu catálogo de marcas
  const marcaGusor = await prisma.marca.upsert({
    where: { codigo: 'MAR-GUSOR' },
    update: {},
    create: { codigo: 'MAR-GUSOR', nombre: 'GUSOR', estado: true }
  });

  // 3. Crear el KIT donde irá la pinza
  const kit = await prisma.kit.upsert({
    where: { codigoKit: 'KIT-OFT-01' },
    update: {},
    create: {
      codigoKit: 'KIT-OFT-01',
      nombre: 'Set de Microcirugía Oftalmológica',
      numeroKit: 1,
      cantidad: 1,
      estado: 'Habilitado',
      especialidadId: especialidad.id,
      subespecialidadId: subespecialidad.id,
      tipoSubespecialidad: 'Microcirugía'
    }
  });

  // 4. CREAR LA HOJA DE VIDA EXACTA
  const instrumento = await prisma.hojaVidaInstrumento.upsert({
    where: { codigo: 'OFGLPO0004' }, // 👈 ESTE ES EL CÓDIGO QUE LEE TU CÁMARA
    update: {
        nombre: 'Pinza Relojero',
        fabricante: 'GUSOR',
        referencia: 'G51-3902',
        marcaId: marcaGusor.id,
    },
    create: {
      codigo: 'OFGLPO0004', // 👈 SE GUARDA ESTE CÓDIGO EXACTO EN LA BD
      nombre: 'Pinza Relojero',
      fabricante: 'GUSOR',
      paisOrigen: 'Desconocido', // Puedes ajustarlo si conoces el país
      numeroSerie: 'SN-G51-3902-01',
      registroInvima: 'INVIMA-PENDIENTE',
      material: 'Acero Inoxidable',
      esterilizacion: 'Autoclave',
      frecuenciaMantenimiento: 'Anual',
      estadoActual: 'Habilitado',
      referencia: 'G51-3902', // 👈 REFERENCIA EXACTA
      
      // Relaciones
      especialidadId: especialidad.id,
      subespecialidadId: subespecialidad.id,
      tipoId: tipoSub.id,
      proveedorId: proveedor.id,
      propietarioId: admin.id,
      kitId: kit.id,
      marcaId: marcaGusor.id // 👈 AMARRADO A LA MARCA GUSOR
    }
  });

  // 5. Vincular formalmente al Kit
  const relacion = await prisma.instrumentoEnKit.findFirst({
    where: { kitId: kit.id, instrumentoId: instrumento.id }
  });

  if (!relacion) {
    await prisma.instrumentoEnKit.create({
      data: { kitId: kit.id, instrumentoId: instrumento.id }
    });
  }

  console.log('✅ ¡Hoja de Vida de la Pinza Relojero creada exitosamente!');
  console.log(`📌 Código para la cámara: ${instrumento.codigo}`);
  console.log(`📌 Instrumento: ${instrumento.nombre}`);
  console.log(`📌 Marca vinculada: GUSOR | Referencia: ${instrumento.referencia}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });