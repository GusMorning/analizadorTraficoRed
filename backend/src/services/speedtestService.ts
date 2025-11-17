import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SPEEDTEST_BIN = process.env.SPEEDTEST_BIN ?? 'speedtest';

export interface SpeedtestResult {
  ping: number;
  download: number;
  upload: number;
  isp: string;
  server: string;
  timestamp: string;
  rawOutput?: string;
}

export const runSpeedtest = async (): Promise<SpeedtestResult> => {
  const { stdout } = await execFileAsync(
    SPEEDTEST_BIN,
    ['--accept-license', '--accept-gdpr', '--format=json'],
    { timeout: 120_000 }
  );
  const parsed = JSON.parse(stdout);
  const downloadMbps = parsed.download?.bandwidth ? (parsed.download.bandwidth * 8) / 1_000_000 : 0;
  const uploadMbps = parsed.upload?.bandwidth ? (parsed.upload.bandwidth * 8) / 1_000_000 : 0;
  return {
    ping: parsed.ping?.latency ?? 0,
    download: Number(downloadMbps.toFixed(2)),
    upload: Number(uploadMbps.toFixed(2)),
    isp: parsed.isp ?? 'Desconocido',
    server: parsed.server?.name ?? 'Servidor desconocido',
    timestamp: new Date().toISOString(),
    rawOutput: stdout
  };
};
