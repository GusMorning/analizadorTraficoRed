import { Request, Response } from 'express';
import { runSpeedtest } from '../services/speedtestService.js';

export const handleSpeedtest = async (_req: Request, res: Response) => {
  try {
    const result = await runSpeedtest();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};
