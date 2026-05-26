import { Router } from 'express';
import { historialTrasladosController } from './historialTraslados.controller';

const router = Router();

router.get('/kits', historialTrasladosController.listarKits);
router.get('/kits/:id/contenido', historialTrasladosController.obtenerContenidoKit);
router.get('/instrumentos', historialTrasladosController.listarInstrumentos);
router.get('/:id/detalle', historialTrasladosController.obtenerDetalle);
router.get('/:id/instrumental', historialTrasladosController.obtenerEstadoInstrumental);
router.put('/:id/instrumental', historialTrasladosController.guardarAprobacionInstrumental);
router.put('/:id/prorroga', historialTrasladosController.actualizarProrroga);

export default router;
