/**
 * Cliente de la API
 * 
 * Acá está todo el código para hablar con el backend. Son como los "mensajeros"
 * que van y vienen trayendo y llevando información entre el frontend y el servidor.
 * 
 * Funciones disponibles:
 * - listTests: Traer la lista de pruebas guardadas
 * - getTestDetail: Traer todos los detalles de una prueba específica
 * - createTest: Crear y correr una nueva prueba
 * - scanNetwork: Buscar dispositivos en tu red
 * - runSpeedtest: Medir tu velocidad de internet
 * - portScan: Ver qué puertos tiene abiertos un dispositivo
 */

import { AppSettings } from '../context/SettingsContext';
import { CreateTestPayload, PortScanResult, ScanResult, SpeedtestSnapshot, TestDetail, TestRecord } from '../types/test';

/**
 * Función helper para construir URLs completas
 * 
 * Toma la URL base de la config y le pega la ruta del endpoint.
 * Por ejemplo: http://localhost:4000/api + /tests = http://localhost:4000/api/tests
 */
const withBase = (settings: AppSettings, path: string) => {
  const base = settings.apiBaseUrl.replace(/\/$/, ''); // Le quitamos el / final si tiene
  return `${base}${path}`;
};

/**
 * Función helper para manejar respuestas
 * 
 * Revisa si la petición salió bien, y si no, tira un error.
 * También parsea el JSON automáticamente.
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Algo salió mal con la API');
  }
  return (await response.json()) as T;
};

/**
 * El objeto api con todos los métodos
 * 
 * Cada método hace una petición HTTP al backend y retorna una Promise.
 * Todos reciben 'settings' como primer parámetro para saber a dónde conectarse.
 */
export const api = {
  /**
   * Listar todas las pruebas
   * 
   * Trae un resumen de todas las pruebas que hiciste, ordenadas de la más
   * reciente a la más vieja. Perfecto para la página de historial.
   */
  listTests: (settings: AppSettings) =>
    fetch(withBase(settings, '/tests')).then((res) => handleResponse<TestRecord[]>(res)),
  
  /**
   * Ver detalle de una prueba
   * 
   * Trae TODA la info de una prueba específica, incluyendo el detalle de
   * cada paquete que se mandó. Útil cuando haces click en una prueba del historial.
   */
  getTestDetail: (settings: AppSettings, id: string) =>
    fetch(withBase(settings, `/tests/${id}`)).then((res) => handleResponse<TestDetail>(res)),
  
  /**
   * Crear una nueva prueba
   * 
   * Manda toda la config al backend para que cree y ejecute una prueba nueva.
   * La prueba corre en segundo plano y puedes ver el progreso en tiempo real
   * gracias al WebSocket.
   */
  createTest: (settings: AppSettings, payload: CreateTestPayload) =>
    fetch(withBase(settings, '/tests'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then((res) => handleResponse<{ id: string; createdAt: string }>(res)),
  
  /**
   * Escanear la red local
   * 
   * Busca todos los dispositivos conectados en un rango de IPs.
   * Por ejemplo, si tu red es 192.168.1.0/24, te dice qué IPs están ocupadas
   * y qué dispositivo hay en cada una (si puede identificarlo).
   */
  scanNetwork: (settings: AppSettings, range: string) =>
    fetch(withBase(settings, `/scan?range=${encodeURIComponent(range)}`)).then((res) =>
      handleResponse<ScanResult>(res)
    ),
  
  /**
   * Hacer un speedtest
   * 
   * Mide tu velocidad de internet (ping, download, upload) usando speedtest-cli.
   * Tarda como 30-60 segundos, así que ten paciencia.
   */
  runSpeedtest: (settings: AppSettings) =>
    fetch(withBase(settings, '/speedtest')).then((res) => handleResponse<SpeedtestSnapshot>(res)),
  
  /**
   * Escanear puertos de un host
   * 
   * Ve qué puertos tiene abiertos un dispositivo específico.
   * Por ejemplo, puedes buscar si tiene el puerto 80 (HTTP) o 22 (SSH) abierto.
   * Puedes especificar un rango tipo "1-1000" o puertos específicos tipo "80,443,8080"
   */
  portScan: (settings: AppSettings, target: string, range: string) =>
    fetch(
      withBase(
        settings,
        `/port-scan?target=${encodeURIComponent(target)}&ports=${encodeURIComponent(range)}`
      )
    ).then((res) => handleResponse<PortScanResult>(res))
};
