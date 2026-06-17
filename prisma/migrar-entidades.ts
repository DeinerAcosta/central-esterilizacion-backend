/**
 * Migración — completa los campos responsable / ciudad / correo en Entidad.
 *
 * El seed antiguo solo guardó nombre + nit + contacto (donde contacto era una
 * cadena con "Nombre - Teléfono"). Aquí:
 *   1. Extraemos el responsable y el teléfono del campo contacto
 *   2. Asignamos una ciudad real (mapa por nombre)
 *   3. Generamos correo coherente con el dominio de la entidad
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PerfilEntidad { ciudad: string; dominio: string }

const MAPA_PERFILES: Record<string, PerfilEntidad> = {
  'Clínica del Caribe':          { ciudad: 'Barranquilla', dominio: 'clinicadelcaribe.com.co' },
  'Hospital Universitario Norte':{ ciudad: 'Bogotá',       dominio: 'hospitaln.com.co' },
  'IPS Salud Total':             { ciudad: 'Cali',         dominio: 'ipssaludtotal.com.co' },
  'Centro Médico San Rafael':    { ciudad: 'Medellín',     dominio: 'cmsanrafael.com.co' },
  'Clínica Oftálmica Visión':    { ciudad: 'Cartagena',    dominio: 'oftvision.com.co' },
};

const slugCorreo = (s: string) =>
  s.toLowerCase()
   .normalize('NFD').replace(/[̀-ͯ]/g, '')
   .replace(/[^a-z0-9]+/g, '.')
   .replace(/^\.+|\.+$/g, '');

async function main() {
  console.log('🔄 Hidratando Entidad.responsable / ciudad / correo…');

  const entidades = await prisma.entidad.findMany();
  let updated = 0;

  for (const e of entidades) {
    const perfil = MAPA_PERFILES[e.nombre] ?? { ciudad: 'Barranquilla', dominio: 'entidad.com.co' };

    // contacto antiguo viene como "Dra. Ana Quintero - 3009876543"
    let responsable: string | null = e.responsable ?? null;
    let telefono:    string | null = e.contacto    ?? null;
    if (!responsable && e.contacto && e.contacto.includes(' - ')) {
      const [nombre, tel] = e.contacto.split(' - ').map(s => s.trim());
      responsable = nombre || null;
      telefono    = tel || e.contacto;
    }

    const correoLocal = responsable
      ? slugCorreo(responsable).split('.').slice(0, 2).join('.')
      : slugCorreo(e.nombre);
    const correo = e.correo ?? `${correoLocal}@${perfil.dominio}`;

    await prisma.entidad.update({
      where: { id: e.id },
      data: {
        responsable: responsable ?? 'Sin responsable',
        ciudad:      e.ciudad ?? perfil.ciudad,
        correo,
        contacto:    telefono,
      },
    });
    updated++;
  }

  console.log(`   ✅ ${updated} entidades actualizadas`);
  console.log('🌱 Migración completada.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
