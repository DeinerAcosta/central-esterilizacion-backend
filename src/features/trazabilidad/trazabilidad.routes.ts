import { Router } from 'express';
import { trazabilidadController } from './trazabilidad.controller';

const router = Router();

// 1. Obtener la grilla de Asignaciones y Ciclos
router.get('/', trazabilidadController.getTrazabilidad);

// 2. Obtener los instrumentos de una asignación específica para aprobar
router.get('/:cicloId/instrumentos', trazabilidadController.getInstrumentosAsignacion);

// 3. Obtener los detalles completos de un ciclo para la vista "Detalles de Trazabilidad"
router.get('/:cicloId/detalles', trazabilidadController.getDetallesCiclo);

// 4. Guardar la aprobación/rechazo de los instrumentos
router.post('/:cicloId/aprobar', trazabilidadController.aprobarAsignacion);

export default router;