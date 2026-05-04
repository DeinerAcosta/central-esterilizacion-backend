import { Router } from 'express';
import { trazabilidadController } from './trazabilidad.controller';

const router = Router();

router.get('/', trazabilidadController.getTrazabilidad);
router.get('/:cicloId/instrumentos', trazabilidadController.getInstrumentosAsignacion);
router.get('/:cicloId/detalles', trazabilidadController.getDetallesCiclo);
router.post('/:cicloId/aprobar', trazabilidadController.aprobarAsignacion);

export default router;