/**
 * Base de Datos SQLite
 * 
 * Acá es donde guardamos todo: las pruebas que hicimos, los resultados,
 * cada paquete que mandamos... todo queda registrado.
 * 
 * Usamos SQLite porque es súper simple - es solo un archivo, no necesitas
 * instalar MySQL ni nada complicado. Y funciona perfecto para este proyecto.
 * 
 * Tenemos dos tablas:
 * - tests: Guarda info general de cada prueba (nombre, configuración, resultados)
 * - packet_results: Guarda el detalle de cada paquete individual
 * 
 * Configuración técnica:
 * - Usamos modo WAL (Write-Ahead Logging) para que varias operaciones puedan
 *   pasar al mismo tiempo sin problemas
 * - Las migraciones se hacen automáticamente para agregar columnas nuevas
 */

import Database from 'better-sqlite3';

// Creamos o abrimos la base de datos
const db = new Database('network-lab.db');

// Activamos el modo WAL - básicamente hace que todo vaya más rápido
db.pragma('journal_mode = WAL');

/**
 * Creamos las tablas si no existen
 * 
 * La tabla 'tests' tiene un montón de campos porque guardamos TODO:
 * - Info técnica: host, puerto, protocolo, tamaño de paquetes, etc.
 * - Contexto: tipo de red, proveedor, ubicación, dispositivo
 * - Resultados: latencia promedio, jitter, pérdida de paquetes, etc.
 * - Speedtest (opcional): velocidades de internet que había cuando hicimos la prueba
 * 
 * La tabla 'packet_results' es más simple: un registro por cada paquete que mandamos
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mode TEXT NOT NULL,
    targetHost TEXT NOT NULL,
    targetPort INTEGER NOT NULL,
    protocol TEXT NOT NULL,
    packetSize INTEGER NOT NULL,
    packetCount INTEGER NOT NULL,
    intervalMs INTEGER NOT NULL,
    networkType TEXT,
    provider TEXT,
    location TEXT,
    latitude REAL,
    longitude REAL,
    device TEXT,
    signalStrength TEXT,
    internetDirection TEXT,
    bandFrequency TEXT,
    distanceDescription TEXT,
    plan TEXT,
    signalSource TEXT,
    interpretationNotes TEXT,
    status TEXT NOT NULL,
    avgLatency REAL,
    maxLatency REAL,
    minLatency REAL,
    jitter REAL,
    throughput REAL,
    packetLoss REAL,
    totalDuration REAL,
    speedtestPing REAL,
    speedtestDownload REAL,
    speedtestUpload REAL,
    speedtestServer TEXT,
    speedtestIsp TEXT,
    speedtestTimestamp TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS packet_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    testId TEXT NOT NULL,
    seq INTEGER NOT NULL,
    sentAt TEXT NOT NULL,
    receivedAt TEXT,
    rtt REAL,
    status TEXT NOT NULL,
    FOREIGN KEY(testId) REFERENCES tests(id) ON DELETE CASCADE
);
`);

/**
 * Migraciones para agregar columnas de geolocalización
 * 
 * Esto es por si actualizaste de una versión vieja que no tenía latitud/longitud.
 * Si ya existen las columnas, el try-catch hace que no explote todo.
 */
try {
  db.exec('ALTER TABLE tests ADD COLUMN latitude REAL');
} catch (error) {
  // Ya existe, no pasa nada
}
try {
  db.exec('ALTER TABLE tests ADD COLUMN longitude REAL');
} catch (error) {
  // Ya existe, no pasa nada
}

export default db;
