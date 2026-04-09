import { Router } from 'express';
import { 
  getSubespecialidades, 
  createSubespecialidad, 
  updateSubespecialidad, 
  toggleEstadoSubespecialidad, 
  getListasSoporte,
  obtenerConKits // <-- 1. Importamos la nueva función
} from './subespecialidades.controller';

const router = Router();

router.get('/listas', getListasSoporte);

// 2. NUEVA RUTA: Obtener subespecialidades con sus kits para el histórico
router.get('/with-kits', obtenerConKits); 

router.get('/', getSubespecialidades);
router.post('/', createSubespecialidad);
router.put('/:id', updateSubespecialidad);
router.patch('/:id/estado', toggleEstadoSubespecialidad);

export default router;