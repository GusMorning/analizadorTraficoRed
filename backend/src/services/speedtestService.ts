/**
 * Servicio de Speedtest
 * 
 * Ejecuta pruebas de velocidad de internet utilizando Speedtest CLI de Ookla.
 * Mide ping, velocidad de descarga y velocidad de subida.
 * 
 * Requisito: speedtest CLI debe estar instalado y disponible en PATH
 * Descarga: https://www.speedtest.net/apps/cli
 * 
 * Variables de entorno:
 * - SPEEDTEST_BIN: Ruta al ejecutable de speedtest (default: 'speedtest')
 * 
 * @example
 * const result = await runSpeedtest();
 * console.log(`Ping: ${result.ping}ms, Download: ${result.download}Mbps`);
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SPEEDTEST_BIN = process.env.SPEEDTEST_BIN ?? 'speedtest';

/**
 * Resultado de una prueba de velocidad
 */
export interface SpeedtestResult {
  /** Latencia en milisegundos */
  ping: number;
  /** Velocidad de descarga en Mbps */
  download: number;
  /** Velocidad de subida en Mbps */
  upload: number;
  /** Proveedor de servicio de internet */
  isp: string;
  /** Servidor de speedtest utilizado */
  server: string;
  /** Timestamp de la prueba */
  timestamp: string;
  /** Salida JSON raw completa (para debugging) */
  rawOutput?: string;
}

/**
 * Ejecuta una prueba de velocidad de internet
 * 
 * Utiliza Speedtest CLI de Ookla para medir:
 * - Ping (latencia al servidor más cercano)
 * - Velocidad de descarga
 * - Velocidad de subida
 * 
 * La prueba puede tardar 30-60 segundos en completarse.
 * Requiere conexión a internet y acepta automáticamente licencias.
 * 
 * @returns Resultado con métricas de velocidad
 * @throws Error si speedtest no está instalado o falla la prueba
 * 
 * @example
 * try {
 *   const result = await runSpeedtest();
 *   console.log(`ISP: ${result.isp}`);
 *   console.log(`Download: ${result.download} Mbps`);
 *   console.log(`Upload: ${result.upload} Mbps`);
 * } catch (error) {
 *   console.error('Speedtest failed:', error);
 * }
 */
export const runSpeedtest = async (): Promise<SpeedtestResult> => {
  const { stdout } = await execFileAsync(
    SPEEDTEST_BIN,
    ['--accept-license', '--accept-gdpr', '--format=json'],
    { timeout: 120_000 }
  );
  const parsed = JSON.parse(stdout);
  
  // Convertir bandwidth (bytes/s) a Mbps
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
