import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { indicadoresController } from './indicadores.controller';

const router = Router();

// Multer: evidencias del indicador de primera carga (3 archivos por registro).
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/indicadores';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/biologico', indicadoresController.listarBiologico);
router.get('/gas', indicadoresController.listarGas);
router.get('/paquetes', indicadoresController.listarPaquetes);
router.get('/primera-carga', indicadoresController.listarPrimeraCarga);
router.post(
  '/primera-carga',
  upload.fields([
    { name: 'integradorFisico',  maxCount: 1 },
    { name: 'indicadorBiologico', maxCount: 1 },
    { name: 'indicadorQuimico',   maxCount: 1 },
  ]),
  indicadoresController.crearPrimeraCarga,
);
router.get('/detalle/:id', indicadoresController.obtenerDetalle);

export default router;
