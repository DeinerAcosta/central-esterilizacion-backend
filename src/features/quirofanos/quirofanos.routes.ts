import { Router } from 'express';
import { 
  getQuirofanos, 
  createQuirofano, 
  updateQuirofano, 
  toggleEstadoQuirofano, 
  getListasSoporte 
} from './quirofanos.controller';

const router = Router();

router.get('/listas', getListasSoporte);
router.get('/', getQuirofanos);
router.post('/', createQuirofano);
router.put('/:id', updateQuirofano);
router.patch('/:id/estado', toggleEstadoQuirofano);

export default router;