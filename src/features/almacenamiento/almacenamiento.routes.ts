import { Router } from 'express';
import { almacenamientoController } from './almacenamiento.controller';

const router = Router();

// GETs existentes
router.get('/insumos',              almacenamientoController.obtenerInsumos);
router.get('/instrumentos',         almacenamientoController.obtenerInstrumentos);
router.get('/kits',                 almacenamientoController.obtenerKits);
router.get('/historial-prestamos',  almacenamientoController.getHistorialPrestamos);

// ✅ POSTs que faltaban
router.post('/enviar-set',          almacenamientoController.enviarSetQuirofano);
router.post('/insumos/:tipo',       almacenamientoController.registrarMovimientoInsumo);

export default router;