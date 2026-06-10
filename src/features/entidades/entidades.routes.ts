import { Router } from 'express';
import {
  listar, listarCiudades, crear, actualizar, cambiarEstado,
} from './entidades.controller';

const router = Router();

router.get('/ciudades', listarCiudades);
router.get('/', listar);
router.post('/', crear);
router.put('/:id', actualizar);
router.patch('/:id/estado', cambiarEstado);

export default router;
