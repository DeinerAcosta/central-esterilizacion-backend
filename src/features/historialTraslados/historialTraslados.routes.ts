import { Router } from 'express';
import { historialTrasladosController } from './historialTraslados.controller';

const router = Router();

router.get('/kits', historialTrasladosController.listarKits);
router.get('/kits/:id/contenido', historialTrasladosController.obtenerContenidoKit);
router.get('/instrumentos', historialTrasladosController.listarInstrumentos);

export default router;
