import { Request, Response } from 'express';
import { z } from 'zod';
import { createTest, getTestDetail, listTests } from '../services/testService.js';

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

export const handleListTests = (_req: Request, res: Response) => {
  const tests = listTests();
  return res.json(tests);
};

export const handleGetTestDetail = (req: Request, res: Response) => {
  const { id } = req.params;
  const test = getTestDetail(id);
  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }
  return res.json(test);
};
