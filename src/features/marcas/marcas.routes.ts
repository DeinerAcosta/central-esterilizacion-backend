import { Router } from 'express';
import { getMarcas, createMarca, updateMarca, toggleEstadoMarca } from './marcas.controller';

const router = Router();

router.get('/', getMarcas);
router.post('/', createMarca);
router.put('/:id', updateMarca);
router.patch('/:id/estado', toggleEstadoMarca);

export default router;