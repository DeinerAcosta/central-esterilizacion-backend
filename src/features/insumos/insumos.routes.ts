import { Router } from 'express';
import { 
  getInsumos, 
  createInsumo, 
  updateInsumo, 
  toggleEstadoInsumo, 
  getListasSoporte,
  getCatalogoInsumos
} from './insumos.controller';

const router = Router();

router.get('/listas',   getListasSoporte);
// ✅ NUEVO: catálogo completo para modal Solicitar/Consumir en Almacenamiento
router.get('/catalogo', getCatalogoInsumos);
router.get('/',         getInsumos);
router.post('/',        createInsumo);
router.put('/:id',      updateInsumo);
router.patch('/:id/estado', toggleEstadoInsumo);

export default router;