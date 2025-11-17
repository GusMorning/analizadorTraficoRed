/**
 * Tipos de TypeScript para las Pruebas de Red
 * 
 * Acá definimos todos los "moldes" de datos que usamos en la app.
 * Piensa en esto como las plantillas que le dicen a TypeScript qué forma
 * tienen nuestros datos. Así evitamos errores bobos tipo mandar un string
 * donde debería ir un número.
 */

// Puede ser prueba en red local (LAN) o por internet (REMOTE)
export type NetworkMode = 'LAN' | 'REMOTE';

// El protocolo que usamos: UDP (rápido pero sin garantías) o TCP (más lento pero confiable)
export type ProtocolType = 'UDP' | 'TCP';

/**
 * Metadata de una Prueba
 * 
 * Todo lo que necesitas saber sobre cómo se configuró una prueba.
 * Incluye tanto lo técnico (puerto, protocolo) como el contexto
 * (dónde estabas, qué red usaste, etc.)
 */
export interface TestMetadata {
  name: string;                    // Un nombre que le pongas (ej: "Prueba WiFi casa")
  mode: NetworkMode;                // LAN o REMOTE
  targetHost: string;               // A dónde mandas los paquetes (IP o dominio)
  targetPort: number;               // El puerto donde está escuchando el agente
  protocol: ProtocolType;           // UDP o TCP
  packetSize: number;               // Tamaño de cada paquete en bytes
  packetCount: number;              // Cuántos paquetes vas a mandar
  intervalMs: number;               // Cuántos milisegundos esperar entre paquete y paquete
  networkType: string;              // Tipo de red: WiFi, 4G, 5G, Ethernet, etc.
  provider: string;                 // Tu ISP (ej: Movistar, Claro, etc.)
  location: string;                 // Dónde hiciste la prueba
  device: string;                   // Qué dispositivo usaste
  signalStrength: string;           // Fuerza de señal (si aplica)
  internetDirection: string;        // Upload o Download
  bandFrequency: string;            // 2.4GHz, 5GHz, etc.
  distanceDescription: string;      // Qué tan lejos estás del router/antena
  plan: string;                     // Tu plan de internet
  signalSource: string;             // Router, Antena, etc.
  interpretationNotes?: string;     // Notas extras que quieras agregar
  latitude?: number | null;         // Coordenadas GPS (opcional)
  longitude?: number | null;
}

/**
 * Snapshot del Speedtest
 * 
 * Los resultados de una prueba de velocidad de internet.
 * La tomamos antes o después de la prueba para tener contexto.
 */
export interface SpeedtestSnapshot {
  ping: number;          // Latencia en milisegundos
  download: number;      // Velocidad de bajada en Mbps
  upload: number;        // Velocidad de subida en Mbps
  isp: string;          // Tu proveedor de internet
  server: string;       // Servidor que usó speedtest para medir
  timestamp: string;    // Cuándo se hizo la prueba
}

/**
 * Progreso de un Paquete Individual
 * 
 * Cada paquete pasa por estados: lo mandamos (sent), lo recibimos de vuelta
 * (received), o se perdió en el camino (lost).
 */
export interface PacketProgress {
  seq: number;              // Número de secuencia (1, 2, 3...)
  status: 'sent' | 'received' | 'lost';
  rtt?: number;             // Round-trip time en ms (solo si volvió)
  sentAt: string;           // Timestamp de cuándo lo mandamos
  receivedAt?: string;      // Timestamp de cuándo volvió (si volvió)
}

/**
 * Resumen Estadístico de la Prueba
 * 
 * Todas las métricas calculadas al final. Esto es lo que realmente
 * nos importa para analizar qué tan buena es la conexión.
 */
export interface TestSummary {
  avgLatency: number;       // Latencia promedio en ms (mientras más bajo, mejor)
  maxLatency: number;       // La peor latencia que tuviste
  minLatency: number;       // La mejor latencia
  jitter: number;           // Qué tan variable es la latencia (bajo = estable)
  throughput: number;       // Velocidad efectiva en Mbps
  packetLoss: number;       // % de paquetes perdidos (0% es perfecto)
  totalDuration: number;    // Cuánto tardó toda la prueba en segundos
}

/**
 * Registro de Prueba (para listados)
 * 
 * Tiene todo lo importante pero sin el detalle paquete por paquete.
 * Esto es lo que vemos en la lista de pruebas del historial.
 */
export interface TestRecord extends TestMetadata, TestSummary {
  id: string;                        // ID único (UUID)
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;                 // Cuándo se creó
  speedtest?: SpeedtestSnapshot | null;  // Speedtest asociado (si lo hiciste)
}

/**
 * Resultado Completo de una Prueba
 * 
 * Igual que TestRecord pero con el array de TODOS los paquetes.
 * Esto es lo que ves cuando abres el detalle de una prueba específica.
 */
export interface TestResult extends TestRecord {
  packets: PacketProgress[];  // Cada paquete que mandaste
}

/**
 * Payload para Crear una Prueba
 * 
 * Lo que mandas al backend cuando quieres crear una nueva prueba.
 */
export interface CreateTestRequest extends TestMetadata {
  speedtest?: SpeedtestSnapshot;  // Puedes incluir un speedtest o no
}
