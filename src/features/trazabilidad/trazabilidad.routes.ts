import { Router } from 'express';
import multer from 'multer';
import { trazabilidadController } from './trazabilidad.controller';

const router = Router();

// ✅ multer en memoria — parsea el FormData cuando hay evidencias adjuntas
const upload = multer({ storage: multer.memoryStorage() });

router.get('/',                         trazabilidadController.getTrazabilidad);
router.get('/:cicloId/instrumentos',    trazabilidadController.getInstrumentosAsignacion);
router.get('/:cicloId/detalles',        trazabilidadController.getDetallesCiclo);

// ✅ FIX: upload.any() permite que req.body esté disponible con FormData
// Sin este middleware, express.json() ignora multipart y req.body llega vacío
router.post('/:cicloId/aprobar', upload.any(), trazabilidadController.aprobarAsignacion);

export default router;