/**
 * Controlador de Escaneo de Red
 * 
 * Maneja las peticiones HTTP para:
 * - Escaneo de dispositivos en la red local
 * - Escaneo de puertos en hosts específicos
 */

import { Request, Response } from 'express';
import { scanNetwork } from '../services/networkScanner.js';
import { runPortScan } from '../services/portScanner.js';

/**
 * GET /api/scan
 * Escanea dispositivos activos en un rango de red
 * 
 * @query range - Rango CIDR a escanear (default: 192.168.0.0/24)
 * @returns Lista de dispositivos encontrados con IP, MAC, hostname, vendor
 * @returns 500 si hay un error en el escaneo
 */
export const handleNetworkScan = async (req: Request, res: Response) => {
  const range = typeof req.query.range === 'string' ? req.query.range : '192.168.0.0/24';
  try {
    const result = await scanNetwork(range);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

/**
 * GET /api/port-scan
 * Escanea puertos abiertos en un host específico
 * 
 * @query target - IP o hostname del objetivo (default: 127.0.0.1)
 * @query ports - Rango de puertos a escanear (default: definido en env o 1-1024)
 * @returns Lista de puertos abiertos con servicio, estado y protocolo
 * @returns 500 si hay un error en el escaneo
 */
export const handlePortScan = async (req: Request, res: Response) => {
  const target = typeof req.query.target === 'string' ? req.query.target : '127.0.0.1';
  const ports = typeof req.query.ports === 'string' ? req.query.ports : undefined;
  try {
    const result = await runPortScan(target, ports);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};
