import { Router } from 'express';
import { insumosQxController } from './insumosqx.controller'; // Verifica que la ruta al controlador sea correcta en tu proyecto
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

// 🛡️ FILTRO DE SEGURIDAD: Validar que el archivo sea estrictamente una imagen
const fileFilter = (req: any, file: any, cb: any) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  
  // Si no es imagen, rechazamos el archivo con un error
  cb(new Error('Formato de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP).'));
};

// Instancia de Multer con las reglas aplicadas
const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 🛡️ LÍMITE: 5MB máximo por foto para no saturar el servidor
});

// Rutas
router.get('/catalogo', insumosQxController.obtenerCatalogo);
router.post('/:cicloId/registrar', upload.single('evidencia'), insumosQxController.registrarInsumosCiclo);

export default router;