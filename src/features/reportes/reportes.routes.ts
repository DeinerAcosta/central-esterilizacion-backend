import { Router } from 'express';
import multer from 'multer';
import { 
  getReportes, 
  createReporte, 
  gestionarReporte, 
  finalizarReporte, 
  validarPin 
} from './reportes.controller'; // Ajusta la ruta según tu estructura

const router = Router();

// Configuración básica para guardar archivos adjuntos
const upload = multer({ dest: 'uploads/' });

// Rutas del módulo
router.get('/', getReportes);
router.post('/validar-pin', validarPin);
router.post('/', upload.fields([{ name: 'evidencia', maxCount: 1 }]), createReporte);
router.put('/:id/gestionar', gestionarReporte);
router.put('/:id/finalizar', upload.fields([{ name: 'informePdf', maxCount: 1 }]), finalizarReporte);

export default router;