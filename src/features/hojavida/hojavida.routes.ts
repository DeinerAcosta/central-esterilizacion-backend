import { Router } from 'express';
import { 
  createHojaVida, 
  getHojasVida, 
  getInventario, 
  getControlBajas, 
  registrarContable, 
  patchEstadoHojaVida,
  updateHojaVida,
  buscarPorCodigo
} from './hojavida.controller'; 
import { getInventarioPorSede, ejecutarTraslado } from './traslados.controller';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

router.get('/buscar', buscarPorCodigo);
router.get('/inventario', getInventario); 
router.get('/bajas', getControlBajas); 
router.get('/inventario-sede', getInventarioPorSede); 
router.get('/', getHojasVida);
router.post('/trasladar', ejecutarTraslado); 
router.post('/', upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'garantia', maxCount: 1 },
  { name: 'registroInvimaDoc', maxCount: 1 },
  { name: 'codigoInstrumentoDoc', maxCount: 1 }
]), createHojaVida);
router.put('/:id', upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'garantia', maxCount: 1 },
  { name: 'registroInvimaDoc', maxCount: 1 },
  { name: 'codigoInstrumentoDoc', maxCount: 1 }
]), updateHojaVida);
router.put('/:id/contable', upload.fields([{ name: 'facturaDoc', maxCount: 1 }]), registrarContable);
router.patch('/:id/estado', patchEstadoHojaVida);

export default router;