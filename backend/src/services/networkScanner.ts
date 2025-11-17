import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const FING_BIN = process.env.FING_BIN;
const NMAP_BIN = process.env.NMAP_BIN ?? 'nmap';
const SCAN_PROVIDER = (process.env.NETWORK_SCAN_PROVIDER ?? (FING_BIN ? 'fing' : 'nmap')).toLowerCase();

export interface FingDevice {
  ip: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  state?: string;
}

export interface FingScanResult {
  target: string;
  devices: FingDevice[];
  rawOutput?: string;
}

const parseFallback = (raw: string): FingDevice[] => {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const devices: FingDevice[] = [];
  for (const line of lines) {
    const match = line.match(/(?<ip>\d+\.\d+\.\d+\.\d+)/);
    if (match?.groups?.ip) {
      devices.push({ ip: match.groups.ip, hostname: line.replace(match[0], '').trim() || undefined });
    }
  }
  return devices;
};

const parseNmap = (raw: string): FingDevice[] => {
  const lines = raw.split(/\r?\n/);
  const devices: FingDevice[] = [];
  let current: FingDevice | null = null;
  for (const line of lines) {
    const reportMatch = line.match(/Nmap scan report for (.*) \((\d+\.\d+\.\d+\.\d+)\)/);
    if (reportMatch) {
      if (current) devices.push(current);
      current = { ip: reportMatch[2], hostname: reportMatch[1] !== reportMatch[2] ? reportMatch[1] : undefined };
      continue;
    }
    const simpleReport = line.match(/Nmap scan report for (\d+\.\d+\.\d+\.\d+)/);
    if (simpleReport) {
      if (current) devices.push(current);
      current = { ip: simpleReport[1] };
      continue;
    }
    const macMatch = line.match(/MAC Address: ([0-9A-F:]+)(?: \((.*)\))?/i);
    if (macMatch && current) {
      current.mac = macMatch[1];
      current.vendor = macMatch[2];
      continue;
    }
    if (line.includes('Host is up') && current) {
      current.state = 'up';
      continue;
    }
  }
  if (current) devices.push(current);
  return devices;
};

const runFing = async (target: string): Promise<FingScanResult> => {
  if (!FING_BIN) {
    throw new Error('Fing CLI no está configurado. Define FING_BIN o usa NETWORK_SCAN_PROVIDER=nmap.');
  }
  const { stdout } = await execFileAsync(FING_BIN, ['--silent', '--json', target], { timeout: 40_000 });
  const trimmed = stdout.trim();
  if (trimmed) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.devices)) {
        return { target, devices: parsed.devices as FingDevice[], rawOutput: trimmed };
      }
    } catch (error) {
      return { target, devices: parseFallback(trimmed), rawOutput: trimmed };
    }
  }
  return { target, devices: [], rawOutput: trimmed };
};

const runNmap = async (target: string): Promise<FingScanResult> => {
  const { stdout } = await execFileAsync(NMAP_BIN, ['-sn', target], { timeout: 40_000 });
  return { target, devices: parseNmap(stdout), rawOutput: stdout };
};

export const scanNetwork = async (target: string): Promise<FingScanResult> => {
  try {
    if (SCAN_PROVIDER === 'fing') {
      return await runFing(target);
    }
    return await runNmap(target);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido ejecutando el escaneo de red.';
    throw new Error(`Escáner de red falló: ${message}`);
  }
};
