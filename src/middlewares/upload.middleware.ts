import multer from 'multer';
import fs from 'fs';
import path from 'path';


const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanFileName = file.originalname.replace(/\s+/g, '_'); // Quita espacios
    cb(null, `${uniqueSuffix}-${cleanFileName}`);
  }
});

export const upload = multer({ storage });