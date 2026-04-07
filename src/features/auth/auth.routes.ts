import { Router } from 'express';
import { loginUsuario, recuperarPassword, cambiarPassword } from './auth.controller';

const router = Router();

router.post('/login', loginUsuario);
router.post('/recover', recuperarPassword);
router.post('/change-password', cambiarPassword);

export default router;