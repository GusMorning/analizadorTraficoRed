/**
 * Servicio de Escaneo de Puertos
 * 
 * Proporciona funcionalidad para escanear puertos abiertos en hosts
 * utilizando Nmap con escaneo TCP connect (-sT).
 * 
 * Variables de entorno:
 * - NMAP_BIN: Ruta al ejecutable de Nmap (default: 'nmap')
 * - PORT_SCAN_RANGE: Rango por defecto de puertos (default: '1-1024')
 * 
 * @example
 * const result = await runPortScan('192.168.1.1', '1-1000');
 * console.log(result.ports); // [{ port: 80, state: 'open', service: 'http' }]
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const NMAP_BIN = process.env.NMAP_BIN ?? 'nmap';
const DEFAULT_PORT_RANGE = process.env.PORT_SCAN_RANGE ?? '1-1024';

/**
 * Representa un puerto escaneado
 */
export interface PortScanEntry {
  /** Número de puerto */
  port: number;
  /** Protocolo (típicamente 'tcp') */
  protocol: string;
  /** Estado del puerto (open, closed, filtered) */
  state: string;
  /** Servicio identificado (http, ssh, etc.) */
  service?: string;
}

/**
 * Resultado del escaneo de puertos
 */
export interface PortScanResult {
  /** Host objetivo */
  target: string;
  /** Rango de puertos escaneados */
  range: string;
  /** Lista de puertos encontrados */
  ports: PortScanEntry[];
  /** Salida raw del comando (para debugging) */
  rawOutput?: string;
}

/**
 * Parser para la salida de Nmap
 * Extrae información de puertos de la tabla de resultados
 * 
 * @param raw - Salida del comando nmap
 * @returns Array de puertos con su información
 */
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

/**
 * Escanea puertos en un host específico
 * 
 * Utiliza Nmap con TCP connect scan (-sT) que no requiere permisos root.
 * El escaneo puede tardar dependiendo del rango de puertos.
 * 
 * @param target - IP o hostname del objetivo
 * @param range - Rango de puertos (ej: '1-1000', '80,443,8080')
 * @returns Resultado con puertos encontrados y sus servicios
 * @throws Error si nmap no está disponible o falla el escaneo
 * 
 * @example
 * const result = await runPortScan('example.com', '80,443');
 * result.ports.forEach(p => console.log(`Port ${p.port} is ${p.state}`));
 */
export const runPortScan = async (target: string, range = DEFAULT_PORT_RANGE): Promise<PortScanResult> => {
  const args = ['-p', range, '-sT', '-T4', target];
  const { stdout } = await execFileAsync(NMAP_BIN, args, { timeout: 60_000 });
  return { target, range, ports: parsePorts(stdout), rawOutput: stdout };
};

