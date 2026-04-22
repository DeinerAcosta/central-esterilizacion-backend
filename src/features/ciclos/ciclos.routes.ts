import { Router } from 'express';
import { ciclosController } from './ciclos.controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/evidencias';
    // Crea la carpeta si no existe
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Genera un nombre único para la foto
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.escaneoInstrumento.deleteMany({
      where: { cicloId: Number(id) }
    });
    await prisma.cicloEsterilizacion.delete({
      where: { id: Number(id) }
    });

    res.json({ success: true, message: 'Ciclo eliminado correctamente de la BD' });
  } catch (error) {
    console.error('Error eliminando ciclo:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al eliminar el ciclo' });
  }
});

export default router;