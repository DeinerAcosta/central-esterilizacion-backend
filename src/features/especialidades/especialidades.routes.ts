import { Router } from 'express';
import { 
  getEspecialidades, 
  createEspecialidad, 
  updateEspecialidad, 
  toggleEstadoEspecialidad 
} from './especialidades.controller';

const router = Router();

router.get('/', getEspecialidades);
router.post('/', createEspecialidad);
router.put('/:id', updateEspecialidad);
router.patch('/:id/estado', toggleEstadoEspecialidad);

export default router;