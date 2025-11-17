import { Request, Response } from 'express';
import { scanNetwork } from '../services/networkScanner.js';
import { runPortScan } from '../services/portScanner.js';

export const handleNetworkScan = async (req: Request, res: Response) => {
  const range = typeof req.query.range === 'string' ? req.query.range : '192.168.0.0/24';
  try {
    const result = await scanNetwork(range);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

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
