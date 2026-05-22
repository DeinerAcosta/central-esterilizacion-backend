import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { tercerosController } from './terceros.controller';

const router = Router();

// ─── Multer: evidencia documental del ingreso ──────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/evidencias';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, 'ingreso-3ros-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Entidades ────────────────────────────────────────────
router.get('/entidades', tercerosController.listarEntidades);
router.post('/entidades', tercerosController.crearEntidad);

// ─── Instrumentos disponibles (modal "Agregar instrumentos") ─
router.get('/instrumentos-disponibles', tercerosController.listarInstrumentosDisponibles);

// ─── Ingresos ─────────────────────────────────────────────
router.get('/ingresos', tercerosController.listarIngresos);
router.get('/ingresos/:id', tercerosController.obtenerIngreso);
router.post('/ingresos', upload.single('evidencia'), tercerosController.crearIngreso);

// ─── Devoluciones ─────────────────────────────────────────
router.get('/devoluciones', tercerosController.listarDevoluciones);
router.get('/devoluciones/:id', tercerosController.obtenerDevolucion);
router.get('/ingresos/:id/pendientes', tercerosController.obtenerPendientesIngreso);
router.post('/ingresos/:id/devoluciones', tercerosController.crearDevolucion);

export default router;
