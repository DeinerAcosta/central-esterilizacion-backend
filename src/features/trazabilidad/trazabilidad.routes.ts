import { Router } from 'express';
import multer from 'multer';
import { trazabilidadController } from './trazabilidad.controller';

const router = Router();

// ✅ multer a disco (uploads/) — parsea el FormData y persiste las evidencias
// de rechazo con un filename accesible vía /uploads/<filename> (igual que Reportes).
const upload = multer({ dest: 'uploads/' });

router.get('/',                         trazabilidadController.getTrazabilidad);
router.get('/:cicloId/instrumentos',    trazabilidadController.getInstrumentosAsignacion);
router.get('/:cicloId/detalles',        trazabilidadController.getDetallesCiclo);

// ✅ FIX: upload.any() permite que req.body esté disponible con FormData
// Sin este middleware, express.json() ignora multipart y req.body llega vacío
router.post('/:cicloId/aprobar', upload.any(), trazabilidadController.aprobarAsignacion);

export default router;