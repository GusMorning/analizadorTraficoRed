import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const NMAP_BIN = process.env.NMAP_BIN ?? 'nmap';
const DEFAULT_PORT_RANGE = process.env.PORT_SCAN_RANGE ?? '1-1024';

export interface PortScanEntry {
  port: number;
  protocol: string;
  state: string;
  service?: string;
}

export interface PortScanResult {
  target: string;
  range: string;
  ports: PortScanEntry[];
  rawOutput?: string;
}

const parsePorts = (raw: string): PortScanEntry[] => {
  const lines = raw.split(/\r?\n/);
  const entries: PortScanEntry[] = [];
  let insideTable = false;
  for (const line of lines) {
    if (line.startsWith('PORT')) {
      insideTable = true;
      continue;
    }
    if (!insideTable) continue;
    if (!line.trim()) break;
    const match = line.match(/^(\d+)\/(\w+)\s+(\w+)\s+(.*)$/);
    if (match) {
      entries.push({
        port: Number(match[1]),
        protocol: match[2],
        state: match[3],
        service: match[4]?.trim() || undefined
      });
    }
  }
  return entries;
};

export const runPortScan = async (target: string, range = DEFAULT_PORT_RANGE): Promise<PortScanResult> => {
  const args = ['-p', range, '-sT', '-T4', target];
  const { stdout } = await execFileAsync(NMAP_BIN, args, { timeout: 60_000 });
  return { target, range, ports: parsePorts(stdout), rawOutput: stdout };
};

