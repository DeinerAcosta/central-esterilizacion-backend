import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return 'Sin registrar';
  return date.toISOString().split('T')[0];
};

export const almacenamientoController = {

  // ==========================================
  // 1. GET /insumos — Historial de movimientos
  // ==========================================
  obtenerInsumos: async (req: Request, res: Response) => {
    try {
      const detalles = await prisma.detalleMovimientoAlmacen.findMany({
        where: { insumoId: { not: null } },
        include: {
          movimiento: true,
          insumo: {
            include: {
              unidadMedida: true,
              presentacion: true,
              proveedor: true,
            }
          }
        },
        orderBy: { movimiento: { fechaMovimiento: 'desc' } }
      });

      const data = detalles.map(det => ({
        id:                    det.id,
        codigo:                det.insumo?.codigo                || 'N/A',
        nombre:                det.insumo?.nombre                || 'N/A',
        descripcion:           det.insumo?.descripcion           || '',
        fechaVencimiento:      formatDate(det.movimiento.fechaMovimiento),
        tipoMovimiento:        det.movimiento.tipoMovimiento === 'Consumo' ? 'Consumido' : 'Solicitado',
        requiereEsterilizacion: det.insumo?.requiereEsterilizacion || false,
        tipoEsterilizacion:    det.insumo?.tipoEsterilizacion    || 'No aplica',
        unidadMedida:          det.insumo?.unidadMedida?.nombre  || 'Unidad',
        presentacion:          det.insumo?.presentacion?.nombre  || 'N/A',
        proveedor:             det.insumo?.proveedor?.nombre     || 'N/A',
        cantidad:              det.cantidad,
      }));

      return res.json({ success: true, data });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en obtenerInsumos:', msg);
      return res.status(500).json({ success: false, message: 'Fallo al obtener historial de insumos', error: msg });
    }
  },

  // ==========================================
  // 2. GET /instrumentos — Stock disponible
  // ==========================================
  obtenerInstrumentos: async (req: Request, res: Response) => {
    try {
      const stockInstrumentos = await prisma.inventario.findMany({
        where: {
          instrumentoId: { not: null },
          estado: 'Disponible'
        },
        include: {
          instrumento: {
            include: {
              especialidad:    true,
              subespecialidad: true,
              tipo:            true,
              kit:             true,
            }
          }
        },
        orderBy: { fechaVencimiento: 'asc' }
      });

      const data = stockInstrumentos.map(item => ({
        id:                  item.id,
        // ✅ FIX: fechaVencimiento viene del Inventario, no del instrumento
        fechaVencimiento:    formatDate(item.fechaVencimiento),
        nombre:              item.instrumento?.nombre                       || 'N/A',
        kit:                 item.instrumento?.kit?.codigoKit               || 'Individual',
        especialidad:        item.instrumento?.especialidad?.nombre         || 'N/A',
        // ✅ FIX: subespecialidad.nombre (Subespecialidad tiene campo 'nombre')
        subEspecialidad:     item.instrumento?.subespecialidad?.nombre      || 'N/A',
        // ✅ FIX: tipo.nombre (TipoSubespecialidad tiene campo 'nombre')
        tipoSubEspecialidad: item.instrumento?.tipo?.nombre                 || 'N/A',
        tipo:                'Instrumento' as const,
        // Campos extra para el modal de detalle
        instrumentoId:       item.instrumento?.id,
        codigoInstrumento:   item.instrumento?.codigo,
        numeroSerie:         item.instrumento?.numeroSerie,
      }));

      return res.json({ success: true, data });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en obtenerInstrumentos:', msg);
      return res.status(500).json({ success: false, message: 'Fallo al obtener stock', error: msg });
    }
  },

  // ==========================================
  // 3. GET /kits — Stock disponible
  // ==========================================
  obtenerKits: async (req: Request, res: Response) => {
    try {
      const stockKits = await prisma.inventario.findMany({
        where: {
          kitId: { not: null },
          estado: 'Disponible'
        },
        include: {
          kit: {
            include: {
              especialidad:    true,
              subespecialidad: true,
            }
          }
        },
        orderBy: { fechaVencimiento: 'asc' }
      });

      const data = stockKits.map(item => ({
        id:                  item.id,
        // ✅ FIX: fechaVencimiento del Inventario
        fechaVencimiento:    formatDate(item.fechaVencimiento),
        kit:                 item.kit?.codigoKit                            || 'N/A',
        nombre:              item.kit?.nombre                               || 'N/A',
        especialidad:        item.kit?.especialidad?.nombre                 || 'N/A',
        // ✅ FIX: subespecialidad.nombre
        subEspecialidad:     item.kit?.subespecialidad?.nombre              || 'N/A',
        // Kit tiene tipoSubespecialidad como string directo
        tipoSubEspecialidad: item.kit?.tipoSubespecialidad                  || 'N/A',
        tipo:                'Kit' as const,
        // Campos extra para el modal de detalle
        kitId:               item.kit?.id,
        codigoKit:           item.kit?.codigoKit,
      }));

      return res.json({ success: true, data });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en obtenerKits:', msg);
      return res.status(500).json({ success: false, message: 'Fallo al obtener stock', error: msg });
    }
  },

  // ==========================================
  // 4. GET /historial-prestamos
  // ==========================================
  getHistorialPrestamos: async (req: Request, res: Response) => {
    try {
      const movimientos = await prisma.movimientoAlmacen.findMany({
        where: { tipoMovimiento: 'Envio_Quirofano' },
        include: {
          quirofano: true,
          detalles: {
            include: {
              kit: {
                include: { especialidad: true, subespecialidad: true }
              },
              instrumento: {
                include: { especialidad: true, subespecialidad: true, tipo: true }
              }
            }
          }
        },
        orderBy: { fechaMovimiento: 'desc' }
      });

      const data = movimientos.flatMap(mov =>
        mov.detalles.map(det => ({
          id:                  det.id,
          fechaPrestamo:       formatDate(mov.fechaMovimiento),
          nombre:              det.kit?.nombre || det.instrumento?.nombre || 'N/A',
          kit:                 det.kit?.codigoKit || null,
          especialidad:        det.kit?.especialidad?.nombre || det.instrumento?.especialidad?.nombre || 'N/A',
          subEspecialidad:     det.kit?.subespecialidad?.nombre || det.instrumento?.subespecialidad?.nombre || 'N/A',
          tipoSubEspecialidad: det.kit?.tipoSubespecialidad || det.instrumento?.tipo?.nombre || 'N/A',
          quirofano:           mov.quirofano?.nombre || 'N/A',
        }))
      );

      return res.json({ success: true, data });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      return res.status(500).json({ success: false, message: 'Fallo en BD', error: msg });
    }
  },

  // ==========================================
  // 5. POST /enviar-set
  // ==========================================
  enviarSetQuirofano: async (req: Request, res: Response) => {
    try {
      const { kitId, quirofanoId, estado, instrumentadorId, responsableId } = req.body as {
        kitId: string; quirofanoId: string; estado: string;
        instrumentadorId?: string | null; responsableId: string;
      };

      const resultado = await prisma.$transaction(async (tx) => {
        const itemInventario = await tx.inventario.findUnique({ where: { id: Number(kitId) } });

        if (!itemInventario || itemInventario.estado !== 'Disponible') {
          throw new Error('El elemento seleccionado no está disponible en el almacén.');
        }

        await tx.inventario.update({
          where: { id: itemInventario.id },
          data: { estado: 'En Quirófano' }
        });

        const movimiento = await tx.movimientoAlmacen.create({
          data: {
            tipoMovimiento:  'Envio_Quirofano',
            quirofanoId:     Number(quirofanoId),
            responsableId:   Number(responsableId),
            instrumentadorId: instrumentadorId ? Number(instrumentadorId) : null,
            detalles: {
              create: [{
                kitId:         itemInventario.kitId,
                instrumentoId: itemInventario.instrumentoId,
                cantidad:      1
              }]
            }
          }
        });

        return movimiento;
      });

      return res.json({ success: true, data: { id: resultado.id }, message: 'Set enviado correctamente' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al procesar el envío';
      console.error('Error al enviar set:', msg);
      return res.status(400).json({ success: false, message: msg });
    }
  },

  // ==========================================
  // 6. POST /insumos/:tipo — Solicitud o Consumo
  // ==========================================
  registrarMovimientoInsumo: async (req: Request, res: Response) => {
    try {
      const { tipo } = req.params;
      const { fecha, responsableId, sedeId, insumos } = req.body as {
        fecha: string; responsableId: string; sedeId: string;
        insumos: Array<{ insumoId: string; cantidad: number }>;
      };

      const tipoMovimiento = tipo === 'consumo' ? 'Consumo' : 'Solicitud';

      await prisma.$transaction(async (tx) => {
        if (tipoMovimiento === 'Consumo') {
          for (const item of insumos) {
            const stockActual = await tx.inventario.findFirst({
              where: { insumoId: Number(item.insumoId), estado: 'Disponible' }
            });

            if (!stockActual || stockActual.cantidad < item.cantidad) {
              throw new Error(`Stock insuficiente para el insumo ID ${item.insumoId}. Disponible: ${stockActual?.cantidad || 0}`);
            }

            const nuevaCantidad = stockActual.cantidad - item.cantidad;
            await tx.inventario.update({
              where: { id: stockActual.id },
              data: {
                cantidad: nuevaCantidad,
                estado:   nuevaCantidad === 0 ? 'Agotado' : 'Disponible'
              }
            });
          }
        }

        await tx.movimientoAlmacen.create({
          data: {
            tipoMovimiento,
            fechaMovimiento:  new Date(fecha),
            sedeDestinoId:    Number(sedeId),
            responsableId:    Number(responsableId),
            detalles: {
              create: insumos.map(item => ({
                insumoId: Number(item.insumoId),
                cantidad: Number(item.cantidad)
              }))
            }
          }
        });
      });

      return res.json({ success: true, message: `Registro de ${tipo} guardado correctamente` });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al procesar la solicitud';
      console.error(`Error al registrar ${req.params.tipo}:`, msg);
      return res.status(400).json({ success: false, message: msg });
    }
  }
};