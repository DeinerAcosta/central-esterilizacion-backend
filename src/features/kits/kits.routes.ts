import { Router } from 'express';
import { getKits, getKitById, createKit, updateKit, toggleEstadoKit } from './kits.controller';

const router = Router();

router.get('/', getKits);
router.get('/:id', getKitById);
router.post('/', createKit);
router.put('/:id', updateKit);
router.patch('/:id/estado', toggleEstadoKit);

export default router;