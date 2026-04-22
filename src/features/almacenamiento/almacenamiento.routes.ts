import { Router } from 'express';
import { almacenamientoController } from './almacenamiento.controller';

const router = Router();

router.get('/insumos', almacenamientoController.obtenerInsumos);
router.get('/instrumentos', almacenamientoController.obtenerInstrumentos);
router.get('/kits', almacenamientoController.obtenerKits);

export default router;