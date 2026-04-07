import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Asegurarnos de que la carpeta "uploads" exista en la raíz del backend
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Guarda los archivos en la carpeta "uploads"
  },
  filename: (req, file, cb) => {
    // Genera un nombre único: FechaActual-NombreOriginal
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanFileName = file.originalname.replace(/\s+/g, '_'); // Quita espacios
    cb(null, `${uniqueSuffix}-${cleanFileName}`);
  }
});

export const upload = multer({ storage });