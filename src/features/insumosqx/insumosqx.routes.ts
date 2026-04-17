import { Router } from 'express';
import { insumosQxController } from './insumosqx.controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configuración de Multer para la foto del indicador
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/evidencias';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'indicador-insumo-qx-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Rutas
router.get('/catalogo', insumosQxController.obtenerCatalogo);
router.post('/:cicloId/registrar', upload.single('evidencia'), insumosQxController.registrarInsumosCiclo);

export default router;