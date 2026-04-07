import { Router } from 'express';
import { getSubespecialidades, createSubespecialidad, updateSubespecialidad, toggleEstadoSubespecialidad, getListasSoporte } from './subespecialidades.controller';

const router = Router();


router.get('/listas', getListasSoporte);
router.get('/', getSubespecialidades);
router.post('/', createSubespecialidad);
router.put('/:id', updateSubespecialidad);
router.patch('/:id/estado', toggleEstadoSubespecialidad);

export default router;