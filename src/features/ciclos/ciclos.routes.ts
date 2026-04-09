import { Router } from 'express';
import { ciclosController } from './ciclos.controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// ==========================================
// CONFIGURACIÓN DE MULTER (Para subir la foto del indicador)
// ==========================================
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

// ==========================================
// RUTAS DE LA API DE CICLOS QX
// ==========================================

// 1. Obtener el conteo dinámico para la barra lateral
// ⚠️ Debe ir antes de las rutas con parámetros dinámicos (:id)
router.get('/conteos', ciclosController.obtenerConteoEtapas);

// 2. NUEVA RUTA: Obtener el histórico de instrumentos por KIT para el Dashboard
router.get('/historico/:kitId', ciclosController.obtenerHistoricoKit);

// 3. Consultar si un KIT está en proceso
router.get('/activo/:kitId', ciclosController.obtenerCicloActivo);

// 4. Avanzar de etapa (con firma PIN)
router.post('/avanzar', ciclosController.avanzarEtapa);

// 5. Escanear instrumento (La cámara)
router.post('/escanear', ciclosController.escanearInstrumento);

// 6. Finalizar el ciclo (Requiere recibir la foto)
router.post('/:cicloId/finalizar', upload.single('evidencia'), ciclosController.finalizarCiclo);

// 7. Cancelar y eliminar un ciclo a medias (El botón cancelar de React)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // A. Primero borramos los escaneos (hijos) usando el nombre EXACTO de tu schema.prisma
    await prisma.escaneoInstrumento.deleteMany({
      where: { cicloId: Number(id) }
    });

    // B. Luego borramos el ciclo (padre)
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