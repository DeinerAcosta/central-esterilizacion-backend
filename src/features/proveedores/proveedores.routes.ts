import { Router } from 'express';
import { 
  getProveedores, 
  createProveedor, 
  updateProveedor, 
  toggleEstadoProveedor, 
  getListasSoporte 
} from './proveedores.controller';

const router = Router();

router.get('/listas', getListasSoporte); 
router.get('/', getProveedores);
router.post('/', createProveedor);
router.put('/:id', updateProveedor);
router.patch('/:id/estado', toggleEstadoProveedor);

export default router;