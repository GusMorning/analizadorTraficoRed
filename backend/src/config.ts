/**
 * Configuración del Backend
 * 
 * Acá guardamos todas las constantes que usa el servidor. Son como las 
 * "reglas del juego" - qué puertos usar, dónde escuchar, etc.
 * 
 * Puedes cambiar estos valores con variables de entorno si quieres:
 * - API_PORT: En qué puerto corre la API (por defecto 4000)
 * - UDP_PROBE_PORT: Puerto para mandar paquetes UDP (por defecto 40000)
 * - TCP_PROBE_PORT: Puerto para mandar paquetes TCP (por defecto 5050)
 * - ALLOWED_ORIGIN: De dónde pueden venir peticiones (por defecto acepta de todos)
 */

// Puerto donde corre nuestra API REST
export const API_PORT = Number(process.env.API_PORT ?? 4000);

// Ruta donde está el WebSocket (no cambies esto sin buena razón)
export const WS_PATH = '/ws';

// Puerto al que mandamos paquetes UDP para las pruebas
// Tip: Si abres Wireshark, filtra por udp.port == 40000 para verlos
export const UDP_PROBE_PORT = Number(process.env.UDP_PROBE_PORT ?? 40000);

// Puerto al que mandamos paquetes TCP para las pruebas  
// Tip Wireshark: tcp.port == 5050
export const TCP_PROBE_PORT = Number(process.env.TCP_PROBE_PORT ?? 5050);

// Configuración CORS - quién puede usar nuestra API
// El '*' significa "todos", pero puedes poner una URL específica si quieres más seguridad
export const DEFAULT_WS_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
