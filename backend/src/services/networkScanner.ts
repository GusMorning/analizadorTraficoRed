/**
 * Servicio de Escaneo de Red
 * 
 * Proporciona funcionalidad para descubrir dispositivos activos en la red local
 * utilizando herramientas nativas del sistema:
 * - Fing CLI (preferido, requiere instalación)
 * - Nmap (fallback)
 * 
 * Variables de entorno:
 * - FING_BIN: Ruta al ejecutable de Fing
 * - NMAP_BIN: Ruta al ejecutable de Nmap (default: 'nmap')
 * - NETWORK_SCAN_PROVIDER: 'fing' o 'nmap' (auto-detectado)
 * 
 * @example
 * const result = await scanNetwork('192.168.1.0/24');
 * console.log(result.devices); // [{ ip, hostname, mac, vendor }]
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const FING_BIN = process.env.FING_BIN;
const NMAP_BIN = process.env.NMAP_BIN ?? 'nmap';
const SCAN_PROVIDER = (process.env.NETWORK_SCAN_PROVIDER ?? (FING_BIN ? 'fing' : 'nmap')).toLowerCase();

/**
 * Representa un dispositivo descubierto en la red
 */
export interface FingDevice {
  /** Dirección IP del dispositivo */
  ip: string;
  /** Hostname (nombre de host) si está disponible */
  hostname?: string;
  /** Dirección MAC si está disponible */
  mac?: string;
  /** Fabricante del dispositivo (vendor) basado en MAC */
  vendor?: string;
  /** Estado del dispositivo (up/down) */
  state?: string;
}

/**
 * Resultado del escaneo de red
 */
export interface FingScanResult {
  /** Rango de red escaneado (CIDR) */
  target: string;
  /** Dispositivos encontrados */
  devices: FingDevice[];
  /** Salida raw del comando (para debugging) */
  rawOutput?: string;
}

/**
 * Parser fallback para salida no estructurada
 * Extrae IPs de cualquier formato de texto
 * 
 * @param raw - Salida raw del comando
 * @returns Array de dispositivos con al menos la IP
 */
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

/**
 * Parser para la salida de Nmap
 * Extrae información de hosts, MACs y vendors
 * 
 * @param raw - Salida del comando nmap
 * @returns Array de dispositivos con información completa
 */
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

/**
 * Ejecuta Fing CLI para escanear la red
 * Fing es más rápido y preciso que nmap para descubrimiento local
 * 
 * @param target - Rango CIDR a escanear (ej: 192.168.1.0/24)
 * @returns Resultado del escaneo con dispositivos encontrados
 * @throws Error si Fing no está configurado
 */
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

/**
 * Ejecuta Nmap para escanear la red
 * Usa ping scan (-sn) para descubrimiento rápido sin escaneo de puertos
 * 
 * @param target - Rango CIDR a escanear (ej: 192.168.1.0/24)
 * @returns Resultado del escaneo con dispositivos encontrados
 */
const runNmap = async (target: string): Promise<FingScanResult> => {
  const { stdout } = await execFileAsync(NMAP_BIN, ['-sn', target], { timeout: 40_000 });
  return { target, devices: parseNmap(stdout), rawOutput: stdout };
};

/**
 * Escanea la red local para descubrir dispositivos activos
 * 
 * Usa Fing si está configurado, de lo contrario usa Nmap.
 * Ambos métodos requieren permisos elevados para obtener información completa.
 * 
 * @param target - Rango CIDR a escanear (ej: '192.168.1.0/24')
 * @returns Resultado con dispositivos encontrados
 * @throws Error si el escaneo falla o las herramientas no están disponibles
 * 
 * @example
 * const result = await scanNetwork('192.168.1.0/24');
 * result.devices.forEach(d => console.log(`${d.ip} - ${d.hostname}`));
 */
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
