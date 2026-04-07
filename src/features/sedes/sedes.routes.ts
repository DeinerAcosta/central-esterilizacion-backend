import { Router } from 'express';
import { getSedes, createSede, updateSede, toggleEstadoSede } from './sedes.controller';

const router = Router();

router.get('/', getSedes);
router.post('/', createSede);
router.put('/:id', updateSede);
router.patch('/:id/estado', toggleEstadoSede);

export default router;