import { Router } from 'express';
import { insumosQxController } from './insumosqx.controller'; // Verifica que la ruta al controlador sea correcta en tu proyecto
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
    cb(null, 'indicador-insumo-qx-' + Date.now() + path.extname(file.originalname));
  }
});
const fileFilter = (req: any, file: any, cb: any) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }

  cb(new Error('Formato de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP).'));
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/catalogo', insumosQxController.obtenerCatalogo);
router.post('/:cicloId/registrar', upload.single('evidencia'), insumosQxController.registrarInsumosCiclo);

export default router;