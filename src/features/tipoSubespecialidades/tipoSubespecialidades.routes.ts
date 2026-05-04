import { Router } from 'express';
import { 
  getTiposSub, 
  createTipoSub, 
  updateTipoSub, 
  toggleEstadoTipoSub, 
  getListasSoporte 
} from './tipoSubespecialidades.controller';

const router = Router();

// Rutas estáticas primero
router.get('/listas', getListasSoporte);

// Rutas base y dinámicas
router.get('/', getTiposSub);
router.post('/', createTipoSub);
router.put('/:id', updateTipoSub); 
router.patch('/:id/estado', toggleEstadoTipoSub); 

export default router;