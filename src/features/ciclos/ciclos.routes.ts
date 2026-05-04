import { Router } from 'express';
import { ciclosController } from './ciclos.controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/evidencias';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'evidencia-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.get('/conteos', ciclosController.obtenerConteoEtapas);
router.get('/tablero', ciclosController.getTableroControl);
router.get('/historico/:kitId', ciclosController.obtenerHistoricoKit);
router.get('/activo/:kitId', ciclosController.obtenerCicloActivo);
router.post('/avanzar', ciclosController.avanzarEtapa);
router.post('/escanear', ciclosController.escanearInstrumento);
router.post('/:cicloId/finalizar', upload.single('evidencia'), ciclosController.finalizarCiclo);
router.delete('/:id', ciclosController.eliminarCiclo); // <- ¡Ruta limpiada!

export default router;