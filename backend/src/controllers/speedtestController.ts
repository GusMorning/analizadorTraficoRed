/**
 * Controlador de Speedtest
 * 
 * Maneja las peticiones HTTP para ejecutar pruebas de velocidad de internet
 * utilizando la CLI de Speedtest (speedtest-cli o ookla speedtest)
 */

import { Request, Response } from 'express';
import { runSpeedtest } from '../services/speedtestService.js';

/**
 * GET /api/speedtest
 * Ejecuta una prueba de velocidad de internet
 * 
 * Mide ping, velocidad de descarga y subida usando speedtest CLI
 * Esta operación puede tardar 30-60 segundos
 * 
 * @returns SpeedtestResult con ping, download, upload, ISP y servidor
 * @returns 500 si hay un error o speedtest no está instalado
 */
export const handleSpeedtest = async (_req: Request, res: Response) => {
  try {
    const result = await runSpeedtest();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};
