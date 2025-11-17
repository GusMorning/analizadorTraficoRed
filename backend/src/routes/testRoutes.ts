/**
 * Rutas de la API REST
 * 
 * Define todos los endpoints disponibles para:
 * - Gestión de pruebas de red (CRUD)
 * - Escaneo de red
 * - Escaneo de puertos
 * - Pruebas de velocidad (speedtest)
 */

import { Router } from 'express';
import { handleCreateTest, handleGetTestDetail, handleListTests } from '../controllers/testController.js';
import { handleNetworkScan, handlePortScan } from '../controllers/networkController.js';
import { handleSpeedtest } from '../controllers/speedtestController.js';

const router = Router();

/** POST /api/tests - Crear y ejecutar una nueva prueba de red */
router.post('/tests', handleCreateTest);

/** GET /api/tests - Listar todas las pruebas almacenadas */
router.get('/tests', handleListTests);

/** GET /api/tests/:id - Obtener detalles de una prueba específica */
router.get('/tests/:id', handleGetTestDetail);

/** GET /api/scan - Escanear dispositivos en la red */
router.get('/scan', handleNetworkScan);

/** GET /api/port-scan - Escanear puertos abiertos en un host */
router.get('/port-scan', handlePortScan);

/** GET /api/speedtest - Ejecutar prueba de velocidad de internet */
router.get('/speedtest', handleSpeedtest);

export default router;
