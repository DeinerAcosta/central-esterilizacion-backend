import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { solicitudesInstrumentoController } from './solicitudesInstrumento.controller';

const router = Router();

// ─── Multer: foto del instrumento solicitado ──────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/solicitudes';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, 'solicitud-' + Date.now() + path.extname(file.originalname));
  },
});

// Solo imágenes para foto del instrumento
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
  if (ok) cb(null, true);
  else cb(new Error('Formato de archivo no válido. Solo JPG, PNG o WEBP.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.get('/', solicitudesInstrumentoController.listar);
router.get('/:id', solicitudesInstrumentoController.obtener);
router.post('/', upload.single('foto'), solicitudesInstrumentoController.crear);

export default router;
