import { Router } from 'express';
import { 
  getSubespecialidades, 
  createSubespecialidad, 
  updateSubespecialidad, 
  toggleEstadoSubespecialidad, 
  getListasSoporte,
  obtenerConKits
} from './subespecialidades.controller';

const router = Router();

router.get('/listas', getListasSoporte);
router.get('/with-kits', obtenerConKits); 
router.get('/', getSubespecialidades);
router.post('/', createSubespecialidad);
router.put('/:id', updateSubespecialidad);
router.patch('/:id/estado', toggleEstadoSubespecialidad);

export default router;