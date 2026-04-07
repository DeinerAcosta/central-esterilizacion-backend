import { Router } from 'express';
import { 
  createHojaVida, 
  getHojasVida, 
  getInventario, 
  getControlBajas, 
  registrarContable, 
  patchEstadoHojaVida,
  updateHojaVida,
  buscarPorCodigo // 🚨 1. NUEVA IMPORTACIÓN AQUÍ
} from './hojavida.controller'; 
import { getInventarioPorSede, ejecutarTraslado } from './traslados.controller';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

/* ══════════════════════════════════════════════════════════
   1. RUTAS ESTÁTICAS (Consultas Generales)
   Siempre deben ir arriba para evitar conflictos con los /:id
   ══════════════════════════════════════════════════════════ */

// 🚨 2. NUEVA RUTA DE BÚSQUEDA 🚨
router.get('/buscar', buscarPorCodigo);

// Obtener listados
router.get('/inventario', getInventario); 
router.get('/bajas', getControlBajas); 
router.get('/inventario-sede', getInventarioPorSede); // ← Ruta para llenar la tabla de traslados
router.get('/', getHojasVida);

// Ejecutar Traslado (POST)
router.post('/trasladar', ejecutarTraslado); // ← Ruta para confirmar el traslado

// Crear nueva hoja de vida (POST con archivos)
router.post('/', upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'garantia', maxCount: 1 },
  { name: 'registroInvimaDoc', maxCount: 1 },
  { name: 'codigoInstrumentoDoc', maxCount: 1 }
]), createHojaVida);


/* ══════════════════════════════════════════════════════════
   2. RUTAS DINÁMICAS (Acciones sobre un ID específico)
   ══════════════════════════════════════════════════════════ */

// Editar hoja de vida
router.put('/:id', upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'garantia', maxCount: 1 },
  { name: 'registroInvimaDoc', maxCount: 1 },
  { name: 'codigoInstrumentoDoc', maxCount: 1 }
]), updateHojaVida);

// Estado y registro contable
router.put('/:id/contable', upload.fields([{ name: 'facturaDoc', maxCount: 1 }]), registrarContable);
router.patch('/:id/estado', patchEstadoHojaVida);

export default router;