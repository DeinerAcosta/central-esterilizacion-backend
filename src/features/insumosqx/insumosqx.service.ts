import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InsumosQxService {

  static async obtenerCatalogo() {
    const insumos = await prisma.insumoQuirurgico.findMany({
      where:   { estado: true, requiereEsterilizacion: true },
      include: { unidadMedida: true, presentacion: true }
    });

    return insumos.map(ins => ({
      id:           ins.id,
      codigo:       ins.codigo,
      nombre:       ins.nombre,
      unidad:       ins.unidadMedida?.nombre  || 'N/A',
      esterilizacion: ins.tipoEsterilizacion  || 'N/A',
      presentacion: ins.presentacion?.nombre  || 'N/A',
    }));
  }

  static async registrarInsumos(
    cicloId:        string,
    pinResponsable: string,
    insumosParsed:  Array<{ id: number; cantidad: number }>,
    evidenciaUrl:   string,
    // ✅ NUEVO: recibir los campos de sellado e indicador
    tipoSellado:    string,
    valorIndicador: string,
    opciones?: {
      destinoSet?:            string;
      almacEstado?:           string;
      almacFechaIngreso?:     string;
      almacFechaVencimiento?: string;
      almacUbicacion?:        string;
      almacObservacion?:      string;
    }
  ) {
    let idCicloNum = Number(cicloId);

    // 1. Validar PIN
    const usuario = await prisma.usuario.findFirst({
      where: { codigoVerificacion: pinResponsable, estado: true }
    });
    if (!usuario) throw new Error("PIN_INVALIDO");

    // 2. Transacción de Base de Datos
    await prisma.$transaction(async (tx) => {
      if (isNaN(idCicloNum) || idCicloNum <= 0) {
        // Crear nuevo ciclo con todos los campos
        const nuevoCiclo = await tx.cicloEsterilizacion.create({
          data: {
            codigoCiclo:          `C-INS-${Date.now().toString().slice(-6)}`,
            estadoGlobal:         'Finalizado',
            etapaActual:          5,
            responsableActualId:  usuario.id,
            evidenciaInsumosUrl:  evidenciaUrl,
            // ✅ NUEVO: guardar tipoSellado y valorIndicador
            tipoEmpaque:          tipoSellado,
            valorIndicador:       valorIndicador,
            // Campos de almacenamiento
            destinoSet:           opciones?.destinoSet           || 'Almacenamiento (Stock)',
            almacEstado:          opciones?.almacEstado           || 'Habilitado',
            almacFechaIngreso:    opciones?.almacFechaIngreso     || new Date().toISOString().split('T')[0],
            almacFechaVencimiento: opciones?.almacFechaVencimiento || '',
            almacUbicacion:       opciones?.almacUbicacion        || '',
            almacObservacion:     opciones?.almacObservacion      || 'Insumos ingresados directamente desde ciclo',
          }
        });
        idCicloNum = nuevoCiclo.id;
      } else {
        // Actualizar ciclo existente
        await tx.cicloEsterilizacion.update({
          where: { id: idCicloNum },
          data: {
            evidenciaInsumosUrl: evidenciaUrl,
            responsableActualId: usuario.id,
            // ✅ NUEVO: actualizar tipoSellado y valorIndicador
            tipoEmpaque:         tipoSellado,
            valorIndicador:      valorIndicador,
          }
        });
        await tx.insumoCiclo.deleteMany({ where: { cicloId: idCicloNum } });
      }

      // Insertar insumos del ciclo
      for (const item of insumosParsed) {
        await tx.insumoCiclo.create({
          data: {
            cicloId:  idCicloNum,
            insumoId: Number(item.id),
            cantidad: Number(item.cantidad),
          }
        });
      }
    });

    return idCicloNum;
  }
}