/**
 * Controlador de Pruebas de Red
 * 
 * Maneja las peticiones HTTP relacionadas con pruebas de red:
 * - Crear nueva prueba
 * - Listar pruebas existentes
 * - Obtener detalles de una prueba específica
 * 
 * Incluye validación de datos con Zod
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { createTest, getTestDetail, listTests } from '../services/testService.js';

/**
 * Schema de validación para datos de speedtest (opcional)
 */
const speedtestSchema = z
  .object({
    ping: z.number(),
    download: z.number(),
    upload: z.number(),
    isp: z.string(),
    server: z.string(),
    timestamp: z.string()
  })
  .optional();

/**
 * Schema de validación para crear una nueva prueba
 * Valida todos los parámetros requeridos y opcionales
 */
const createTestSchema = z.object({
  name: z.string().min(3),
  mode: z.enum(['LAN', 'REMOTE']),
  targetHost: z.string(),
  targetPort: z.number().int().positive(),
  protocol: z.enum(['UDP', 'TCP']),
  packetSize: z.number().int().positive(),
  packetCount: z.number().int().positive(),
  intervalMs: z.number().int().positive(),
  networkType: z.string(),
  provider: z.string(),
  location: z.string(),
  device: z.string(),
  signalStrength: z.string(),
  internetDirection: z.string(),
  bandFrequency: z.string(),
  distanceDescription: z.string(),
  plan: z.string(),
  signalSource: z.string(),
  interpretationNotes: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  speedtest: speedtestSchema
});

/**
 * POST /api/tests
 * Crea y ejecuta una nueva prueba de red
 * 
 * La prueba se ejecuta de forma asíncrona y los resultados
 * se envían en tiempo real vía WebSocket
 * 
 * @returns 201 con { id, createdAt } si es exitoso
 * @returns 400 si la validación falla
 * @returns 500 si hay un error en la ejecución
 */
export const handleCreateTest = async (req: Request, res: Response) => {
  const parseResult = createTestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }
  try {
    const result = await createTest(parseResult.data);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
};

/**
 * GET /api/tests
 * Lista todas las pruebas almacenadas
 * 
 * @returns Array de TestRecord ordenados por fecha descendente
 */
export const handleListTests = (_req: Request, res: Response) => {
  const tests = listTests();
  return res.json(tests);
};

/**
 * GET /api/tests/:id
 * Obtiene los detalles completos de una prueba específica
 * Incluye información de cada paquete individual
 * 
 * @param id - UUID de la prueba
 * @returns TestResult con todos los detalles
 * @returns 404 si la prueba no existe
 */
export const handleGetTestDetail = (req: Request, res: Response) => {
  const { id } = req.params;
  const test = getTestDetail(id);
  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }
  return res.json(test);
};
