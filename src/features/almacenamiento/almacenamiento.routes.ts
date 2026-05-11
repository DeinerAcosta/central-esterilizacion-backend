import { Router } from 'express';
import { almacenamientoController } from './almacenamiento.controller';

const router = Router();

// ==========================================
// RUTAS GET: CONSULTAS DE STOCK E HISTORIAL
// ==========================================

// 1. Obtener historial de insumos (Consumidos/Solicitados)
router.get('/insumos', almacenamientoController.obtenerInsumos);

// 2. Obtener inventario físico de Instrumentos (Disponibles)
router.get('/instrumentos', almacenamientoController.obtenerInstrumentos);

// 3. Obtener inventario físico de Kits (Disponibles)
router.get('/kits', almacenamientoController.obtenerKits);

// 4. Obtener el historial de Kits enviados a Quirófano u otras sedes
router.get('/historial-prestamos', almacenamientoController.getHistorialPrestamos);


// ==========================================
// RUTAS POST: TRANSACCIONES Y MOVIMIENTOS
// ==========================================

// 5. Enviar un Kit desde el Almacén hacia un Quirófano
// El Frontend envía: { kitId, quirofanoId, estado, instrumentadorId, responsableId }
router.post('/enviar-set', almacenamientoController.enviarSetQuirofano);

// 6. Registrar Solicitud o Consumo de Insumos
// El parámetro dinámico ':tipo' recibe 'solicitud' o 'consumo'
// El Frontend envía: { fecha, responsableId, sedeId, insumos: [{insumoId, cantidad}] }
router.post('/insumos/:tipo', almacenamientoController.registrarMovimientoInsumo);

export default router;