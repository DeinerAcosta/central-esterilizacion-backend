import { Router } from 'express';
import { indicadoresController } from './indicadores.controller';

const router = Router();

router.get('/biologico', indicadoresController.listarBiologico);
router.get('/gas', indicadoresController.listarGas);
router.get('/paquetes', indicadoresController.listarPaquetes);
router.get('/primera-carga', indicadoresController.listarPrimeraCarga);
router.get('/detalle/:id', indicadoresController.obtenerDetalle);

export default router;
