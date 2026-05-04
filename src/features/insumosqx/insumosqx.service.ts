import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InsumosQxService {
  static async obtenerCatalogo() {
    const insumos = await prisma.insumoQuirurgico.findMany({
      where: { estado: true, requiereEsterilizacion: true },
      include: { unidadMedida: true, presentacion: true }
    });
    
    return insumos.map(ins => ({
      id: ins.id,
      codigo: ins.codigo,
      nombre: ins.nombre,
      unidad: ins.unidadMedida?.nombre || 'N/A',
      esterilizacion: ins.tipoEsterilizacion || 'N/A',
      presentacion: ins.presentacion?.nombre || 'N/A'
    }));
  }

  static async registrarInsumos(cicloId: string, pinResponsable: string, insumosParsed: any[], evidenciaUrl: string) {
    let idCicloNum = Number(cicloId);

    // 1. Validar PIN
    const usuario = await prisma.usuario.findFirst({ 
      where: { codigoVerificacion: pinResponsable, estado: true } 
    });

    if (!usuario) {
      throw new Error("PIN_INVALIDO");
    }

    // 2. Transacción de Base de Datos
    await prisma.$transaction(async (tx) => {
      // Si no existe un ciclo (ej. cicloId es 0 o "nuevo"), creamos uno global
      if (isNaN(idCicloNum) || idCicloNum <= 0) {
        const nuevoCiclo = await tx.cicloEsterilizacion.create({
          data: {
            codigoCiclo: `C-INS-${Date.now().toString().slice(-6)}`, 
            estadoGlobal: "Finalizado",
            etapaActual: 5,
            responsableActualId: usuario.id,
            evidenciaInsumosUrl: evidenciaUrl
          }
        });
        idCicloNum = nuevoCiclo.id;
      } 
      else {
        // Actualizar el ciclo existente
        await tx.cicloEsterilizacion.update({
          where: { id: idCicloNum },
          data: { 
            evidenciaInsumosUrl: evidenciaUrl,
            responsableActualId: usuario.id
          }
        });
        // Limpiamos insumos anteriores en caso de ser una reedición
        await tx.insumoCiclo.deleteMany({ where: { cicloId: idCicloNum } });
      }

      // Insertar todos los insumos relacionados
      for (const item of insumosParsed) {
        await tx.insumoCiclo.create({
          data: {
            cicloId: idCicloNum,
            insumoId: Number(item.id),
            cantidad: Number(item.cantidad)
          }
        });
      }
    });

    return idCicloNum;
  }
}