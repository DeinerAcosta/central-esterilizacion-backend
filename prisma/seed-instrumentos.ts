import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando inyección de datos para Pinza Relojero GUSOR (OFGLPO0004)...');

  const admin = await prisma.usuario.findFirst({ where: { email: 'pruebas.central.esterilizacion@gmail.com' } });
  
  if (!admin) {
    console.error('❌ Error: No se encontró el usuario admin. Corre primero el seed de usuarios.');
    return;
  }

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

  const marcaGusor = await prisma.marca.upsert({
    where: { codigo: 'MAR-GUSOR' },
    update: {},
    create: { codigo: 'MAR-GUSOR', nombre: 'GUSOR', estado: true }
  });

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

  const instrumento = await prisma.hojaVidaInstrumento.upsert({
    where: { codigo: 'OFGLPO0004' },
    update: {
        nombre: 'Pinza Relojero',
        fabricante: 'GUSOR',
        referencia: 'G51-3902',
        marcaId: marcaGusor.id,
    },
    create: {
      codigo: 'OFGLPO0004', 
      nombre: 'Pinza Relojero',
      fabricante: 'GUSOR',
      paisOrigen: 'Desconocido',
      numeroSerie: 'SN-G51-3902-01',
      registroInvima: 'INVIMA-PENDIENTE',
      material: 'Acero Inoxidable',
      esterilizacion: 'Autoclave',
      frecuenciaMantenimiento: 'Anual',
      estadoActual: 'Habilitado',
      referencia: 'G51-3902', 
      especialidadId: especialidad.id,
      subespecialidadId: subespecialidad.id,
      tipoId: tipoSub.id,
      proveedorId: proveedor.id,
      propietarioId: admin.id,
      kitId: kit.id,
      marcaId: marcaGusor.id 
    }
  });
  
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