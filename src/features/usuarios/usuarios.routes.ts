import { Router } from 'express';
import { getUsuarios, createUsuario, updateUsuario, toggleEstadoUsuario, validarPin } from './usuarios.controller';

const router = Router();

// Rutas base
router.get('/', getUsuarios);
router.post('/', createUsuario);

// ✅ NUEVA RUTA: Validación de PIN para el ciclo de esterilización
router.post('/validar-pin', validarPin);

// Rutas con ID (es buena práctica ponerlas al final)
router.put('/:id', updateUsuario);
router.patch('/:id/estado', toggleEstadoUsuario); 

export default router;