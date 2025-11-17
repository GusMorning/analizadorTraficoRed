/**
 * Servicio de Gestión de Pruebas de Red
 * 
 * Servicio principal que coordina:
 * - Creación y almacenamiento de pruebas
 * - Ejecución de pruebas con networkTester
 * - Emisión de eventos en tiempo real vía WebSocket
 * - Consulta de pruebas almacenadas
 * 
 * Las pruebas se almacenan en SQLite y los eventos de progreso
 * se emiten en tiempo real a los clientes conectados vía Socket.IO.
 */

import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { CreateTestRequest, PacketProgress, TestRecord, TestResult } from '../types/test.js';
import { runNetworkTest } from './networkTester.js';

/** Instancia de Socket.IO para eventos en tiempo real */
let io: Server | null = null;

/**
 * Registra la instancia de Socket.IO para emitir eventos
 * Debe llamarse al iniciar el servidor
 * 
 * @param instance - Instancia de Socket.IO Server
 */
export const registerSocket = (instance: Server) => {
  io = instance;
};

/**
 * Prepared statement para insertar una nueva prueba
 * Inserta todos los campos de configuración y metadata inicial
 */
const insertTestStmt = db.prepare(`
  INSERT INTO tests (
    id, name, mode, targetHost, targetPort, protocol,
    packetSize, packetCount, intervalMs, networkType,
    provider, location, latitude, longitude, device,
    signalStrength, internetDirection, bandFrequency,
    distanceDescription, plan, signalSource, interpretationNotes,
    status,
    speedtestPing, speedtestDownload, speedtestUpload,
    speedtestServer, speedtestIsp, speedtestTimestamp,
    createdAt
  ) VALUES (@id, @name, @mode, @targetHost, @targetPort, @protocol,
    @packetSize, @packetCount, @intervalMs, @networkType,
    @provider, @location, @latitude, @longitude, @device,
    @signalStrength, @internetDirection, @bandFrequency,
    @distanceDescription, @plan, @signalSource, @interpretationNotes,
    @status,
    @speedtestPing, @speedtestDownload, @speedtestUpload,
    @speedtestServer, @speedtestIsp, @speedtestTimestamp,
    @createdAt)
`);

/**
 * Prepared statement para actualizar el resumen de una prueba
 * Actualiza el estado y todas las métricas calculadas
 */
const updateTestSummaryStmt = db.prepare(`
  UPDATE tests SET
    status = @status,
    avgLatency = @avgLatency,
    maxLatency = @maxLatency,
    minLatency = @minLatency,
    jitter = @jitter,
    throughput = @throughput,
    packetLoss = @packetLoss,
    totalDuration = @totalDuration
  WHERE id = @id
`);

/** Obtiene todas las pruebas ordenadas por fecha descendente */
const getTestsStmt = db.prepare('SELECT * FROM tests ORDER BY datetime(createdAt) DESC');

/** Obtiene una prueba específica por ID */
const getTestByIdStmt = db.prepare('SELECT * FROM tests WHERE id = ?');

/** Inserta el resultado de un paquete individual */
const insertPacketStmt = db.prepare(`
  INSERT INTO packet_results (testId, seq, sentAt, receivedAt, rtt, status)
  VALUES (@testId, @seq, @sentAt, @receivedAt, @rtt, @status)
`);

/** Obtiene todos los paquetes de una prueba específica */
const getPacketsStmt = db.prepare('SELECT * FROM packet_results WHERE testId = ? ORDER BY seq ASC');

/**
 * Crea y ejecuta una nueva prueba de red
 * 
 * La función:
 * 1. Crea un registro de prueba en la BD con estado 'running'
 * 2. Ejecuta la prueba de forma asíncrona
 * 3. Emite eventos de progreso en tiempo real vía WebSocket
 * 4. Actualiza la BD con los resultados finales
 * 
 * Eventos WebSocket emitidos:
 * - test-started: Cuando comienza la prueba
 * - test-progress: Por cada paquete procesado
 * - test-log: Mensajes de log durante la prueba
 * - test-complete: Cuando finaliza exitosamente
 * - test-error: Si ocurre un error
 * 
 * @param payload - Configuración de la prueba
 * @returns Objeto con id y createdAt de la prueba
 * 
 * @example
 * const { id } = await createTest({
 *   name: 'Prueba WiFi',
 *   mode: 'LAN',
 *   targetHost: '192.168.1.1',
 *   targetPort: 40000,
 *   protocol: 'UDP',
 *   packetSize: 64,
 *   packetCount: 100,
 *   intervalMs: 100,
 *   // ... más configuración
 * });
 */
export const createTest = async (payload: CreateTestRequest) => {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const { speedtest, ...testConfig } = payload;
  
  // Valores por defecto para campos opcionales
  const defaults = {
    networkType: testConfig.networkType ?? 'Desconocida',
    provider: testConfig.provider ?? 'N/A',
    location: testConfig.location ?? 'N/A',
    latitude: testConfig.latitude ?? null,
    longitude: testConfig.longitude ?? null,
    device: testConfig.device ?? 'N/A',
    signalStrength: testConfig.signalStrength ?? 'N/A',
    internetDirection: testConfig.internetDirection ?? 'Desconocido',
    bandFrequency: testConfig.bandFrequency ?? 'N/A',
    distanceDescription: testConfig.distanceDescription ?? 'N/A',
    plan: testConfig.plan ?? 'N/A',
    signalSource: testConfig.signalSource ?? 'N/A',
    interpretationNotes: testConfig.interpretationNotes ?? null
  };
  
  // Insertar prueba en la base de datos con estado 'running'
  insertTestStmt.run({
    id,
    ...testConfig,
    ...defaults,
    status: 'running',
    speedtestPing: speedtest?.ping ?? null,
    speedtestDownload: speedtest?.download ?? null,
    speedtestUpload: speedtest?.upload ?? null,
    speedtestServer: speedtest?.server ?? null,
    speedtestIsp: speedtest?.isp ?? null,
    speedtestTimestamp: speedtest?.timestamp ?? null,
    createdAt
  });

  // Emitir evento de inicio de prueba
  io?.emit('test-started', { id, name: payload.name, createdAt });

  // Ejecutar la prueba de forma asíncrona
  runNetworkTest(id, payload, {
    // Callback para cada paquete procesado
    onPacket: (packet, progress) => {
      // Solo guardar paquetes recibidos o perdidos (no 'sent')
      if (packet.status !== 'sent') {
        insertPacketStmt.run({
          testId: id,
          seq: packet.seq,
          sentAt: packet.sentAt,
          receivedAt: packet.receivedAt ?? null,
          rtt: packet.rtt ?? null,
          status: packet.status
        });
      }
      // Emitir progreso en tiempo real
      io?.emit('test-progress', { testId: id, packet, progress });
    },
    // Callback para mensajes de log
    onLog: (message) => {
      io?.emit('test-log', { testId: id, message });
    }
  })
    .then(({ summary }) => {
      // Prueba completada exitosamente
      updateTestSummaryStmt.run({
        id,
        status: 'completed',
        ...summary
      });
      io?.emit('test-complete', { testId: id, summary });
    })
    .catch((error) => {
      // Error en la prueba - marcar como fallida
      updateTestSummaryStmt.run({
        id,
        status: 'failed',
        avgLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        jitter: 0,
        throughput: 0,
        packetLoss: 100,
        totalDuration: 0
      });
      io?.emit('test-error', { testId: id, message: String(error) });
    });

  return { id, createdAt };
};

/**
 * Lista todas las pruebas almacenadas
 * 
 * Retorna un resumen de todas las pruebas sin los detalles de paquetes individuales.
 * Las pruebas están ordenadas por fecha de creación descendente (más recientes primero).
 * 
 * @returns Array de TestRecord con metadata y resumen de resultados
 * 
 * @example
 * const tests = listTests();
 * tests.forEach(t => console.log(`${t.name}: ${t.packetLoss}% loss`));
 */
export const listTests = (): TestRecord[] => {
  const rows = getTestsStmt.all();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mode: row.mode,
    targetHost: row.targetHost,
    targetPort: row.targetPort,
    protocol: row.protocol,
    packetSize: row.packetSize,
    packetCount: row.packetCount,
    intervalMs: row.intervalMs,
    networkType: row.networkType,
    provider: row.provider,
    location: row.location,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    device: row.device,
    signalStrength: row.signalStrength ?? 'N/A',
    internetDirection: row.internetDirection ?? 'N/A',
    bandFrequency: row.bandFrequency ?? 'N/A',
    distanceDescription: row.distanceDescription ?? 'N/A',
    plan: row.plan ?? 'N/A',
    signalSource: row.signalSource ?? 'N/A',
    interpretationNotes: row.interpretationNotes ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    avgLatency: row.avgLatency ?? 0,
    maxLatency: row.maxLatency ?? 0,
    minLatency: row.minLatency ?? 0,
    jitter: row.jitter ?? 0,
    throughput: row.throughput ?? 0,
    packetLoss: row.packetLoss ?? 0,
    totalDuration: row.totalDuration ?? 0,
    speedtest: row.speedtestPing !== null && row.speedtestPing !== undefined
      ? {
          ping: row.speedtestPing,
          download: row.speedtestDownload ?? 0,
          upload: row.speedtestUpload ?? 0,
          server: row.speedtestServer ?? '',
          isp: row.speedtestIsp ?? '',
          timestamp: row.speedtestTimestamp ?? ''
        }
      : null
  }));
};

/**
 * Obtiene los detalles completos de una prueba específica
 * 
 * Incluye toda la metadata, resumen de resultados y el detalle de cada paquete individual.
 * Útil para análisis detallado y visualizaciones de la prueba.
 * 
 * @param id - UUID de la prueba
 * @returns TestResult completo con array de paquetes, o null si no existe
 * 
 * @example
 * const test = getTestDetail('123e4567-e89b-12d3-a456-426614174000');
 * if (test) {
 *   console.log(`Packets: ${test.packets.length}`);
 *   test.packets.forEach(p => console.log(`Seq ${p.seq}: ${p.rtt}ms`));
 * }
 */
export const getTestDetail = (id: string): TestResult | null => {
  const row = getTestByIdStmt.get(id);
  if (!row) return null;
  const packets = getPacketsStmt.all(id).map((packet) => ({
    seq: packet.seq,
    status: packet.status,
    sentAt: packet.sentAt,
    receivedAt: packet.receivedAt ?? undefined,
    rtt: packet.rtt ?? undefined
  }));
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    targetHost: row.targetHost,
    targetPort: row.targetPort,
    protocol: row.protocol,
    packetSize: row.packetSize,
    packetCount: row.packetCount,
    intervalMs: row.intervalMs,
    networkType: row.networkType,
    provider: row.provider,
    location: row.location,
    device: row.device,
    signalStrength: row.signalStrength ?? 'N/A',
    internetDirection: row.internetDirection ?? 'N/A',
    bandFrequency: row.bandFrequency ?? 'N/A',
    distanceDescription: row.distanceDescription ?? 'N/A',
    plan: row.plan ?? 'N/A',
    signalSource: row.signalSource ?? 'N/A',
    interpretationNotes: row.interpretationNotes ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    avgLatency: row.avgLatency ?? 0,
    maxLatency: row.maxLatency ?? 0,
    minLatency: row.minLatency ?? 0,
    jitter: row.jitter ?? 0,
    throughput: row.throughput ?? 0,
    packetLoss: row.packetLoss ?? 0,
    totalDuration: row.totalDuration ?? 0,
    speedtest: row.speedtestPing !== null && row.speedtestPing !== undefined
      ? {
          ping: row.speedtestPing,
          download: row.speedtestDownload ?? 0,
          upload: row.speedtestUpload ?? 0,
          server: row.speedtestServer ?? '',
          isp: row.speedtestIsp ?? '',
          timestamp: row.speedtestTimestamp ?? ''
        }
      : null,
    packets
  };
};
