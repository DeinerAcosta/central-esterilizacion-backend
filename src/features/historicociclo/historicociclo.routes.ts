import { Router } from 'express';
import { historicoCicloController } from './historicociclo.controller'; 
const router = Router();
router.get('/arbol-jerarquico', historicoCicloController.getArbolJerarquico);
router.get('/kit/:kitId', historicoCicloController.getHistoricoPorKit);
export default router;