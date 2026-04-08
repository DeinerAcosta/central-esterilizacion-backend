import express, { Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './features/auth/auth.routes';
import insumosRoutes from './features/insumos/insumos.routes'; 
import proveedoresRoutes from './features/proveedores/proveedores.routes';
import especialidadesRoutes from './features/especialidades/especialidades.routes';
import subespecialidadesRoutes from './features/subespecialidades/subespecialidades.routes';
import tipoSubespecialidadRoutes from './features/tipoSubespecialidades/tipoSubespecialidades.routes';
import sedesRoutes from './features/sedes/sedes.routes';
import quirofanosRoutes from './features/quirofanos/quirofanos.routes';
import kitsRoutes from './features/kits/kits.routes';
import usuariosRoutes from './features/usuarios/usuarios.routes';
import hojavidaRoutes from './features/hojavida/hojavida.routes';
import marcasRoutes from './features/marcas/marcas.routes';
import reportesRoutes from './features/reportes/reportes.routes'; 
import ciclosRoutes from './features/ciclos/ciclos.routes';
import dashboardRoutes from './features/dashboard/dashboard.routes'; 
import trazabilidadRoutes from './features/trazabilidad/trazabilidad.routes';

const app = express();
const PORT = 4000;

// Configuración de CORS actualizada para permitir la conexión desde Vercel
app.use(cors({
  origin: [
    'http://localhost:5173', // Tu entorno de desarrollo local
    'https://central-esterilizacion-v2-osalvmd3a-deineracostas-projects.vercel.app', // Tu enlace de vista previa de Vercel
    'https://central-esterilizacion-v2.vercel.app' // El enlace principal de Vercel
  ],
  credentials: true // Vital para que funcionen las cookies y el Login
}));

app.use(express.json()); 
app.use('/uploads', express.static('uploads'));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/especialidades', especialidadesRoutes);
app.use('/api/subespecialidades', subespecialidadesRoutes);
app.use('/api/tipos-subespecialidad', tipoSubespecialidadRoutes);
app.use('/api/sedes', sedesRoutes);
app.use('/api/quirofanos', quirofanosRoutes);
app.use('/api/kits', kitsRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/hoja-vida', hojavidaRoutes); 
app.use('/api/marcas', marcasRoutes);
app.use('/api/reportes', reportesRoutes); 
app.use('/api/ciclos', ciclosRoutes); 
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/trazabilidad', trazabilidadRoutes);

app.get('/health', (req: Request, res: Response) => {
    res.json({ msg: 'Servidor Central de Esterilización en línea 🚀' });
});

app.listen(PORT, () => {
    console.log(`✅ Backend corriendo y escuchando en http://localhost:${PORT}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rechazo no manejado en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
});