import { Router } from 'express';
import multer from 'multer';
import { 
  getReportes, 
  createReporte, 
  gestionarReporte, 
  finalizarReporte, 
  validarPin 
} from './reportes.controller'; 

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', getReportes);
router.post('/validar-pin', validarPin);
router.post('/', upload.fields([{ name: 'evidencia', maxCount: 1 }]), createReporte);
router.put('/:id/gestionar', gestionarReporte);
router.put('/:id/finalizar', upload.fields([{ name: 'informePdf', maxCount: 1 }]), finalizarReporte);

export default router;