import { Router } from 'express';
import {
  listarInstrumentos,
  listarKits,
  detalleInstrumento,
  detalleKit,
} from './controlTrazabilidad.controller';

const router = Router();

router.get('/instrumentos',     listarInstrumentos);
router.get('/kits',             listarKits);
router.get('/instrumentos/:id', detalleInstrumento);
router.get('/kits/:id',         detalleKit);

export default router;
