import { Router } from 'express';
import { 
  getTiposSub, 
  createTipoSub, 
  updateTipoSub, 
  toggleEstadoTipoSub, 
  getListasSoporte 
} from './tipoSubespecialidades.controller';

const router = Router();

router.get('/listas', getListasSoporte);
router.get('/', getTiposSub);
router.post('/', createTipoSub);
router.put('/:id', updateTipoSub); // 👈 Debe ser PUT
router.patch('/:id/estado', toggleEstadoTipoSub); // 👈 Debe ser PATCH y terminar en /estado

export default router;