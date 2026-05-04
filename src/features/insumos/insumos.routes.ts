import { Router } from 'express';
import { 
  getInsumos, 
  createInsumo, 
  updateInsumo, 
  toggleEstadoInsumo, 
  getListasSoporte 
} from './insumos.controller';

const router = Router();

router.get('/listas', getListasSoporte);
router.get('/', getInsumos);
router.post('/', createInsumo);
router.put('/:id', updateInsumo);
router.patch('/:id/estado', toggleEstadoInsumo);

export default router;