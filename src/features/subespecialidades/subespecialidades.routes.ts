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

// Rutas estáticas siempre arriba
router.get('/listas', getListasSoporte);
router.get('/with-kits', obtenerConKits); 

// Rutas base y dinámicas (/:id) abajo
router.get('/', getSubespecialidades);
router.post('/', createSubespecialidad);
router.put('/:id', updateSubespecialidad);
router.patch('/:id/estado', toggleEstadoSubespecialidad);

export default router;