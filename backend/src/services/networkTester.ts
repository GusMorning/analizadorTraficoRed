/**
 * Motor de Pruebas de Red (Network Tester)
 * 
 * Módulo principal que ejecuta pruebas de red enviando paquetes UDP o TCP
 * a un agente remoto y midiendo la latencia, jitter, throughput y pérdida de paquetes.
 * 
 * Arquitectura:
 * - Cliente: Envía paquetes con headers JSON que contienen metadata
 * - Agente remoto: Hace echo de los paquetes recibidos
 * - Cliente: Mide RTT al recibir el echo
 * 
 * Protocolos soportados:
 * - UDP: Para pruebas de latencia con mínimo overhead
 * - TCP: Para pruebas de latencia sobre conexión confiable
 * 
 * Filtros Wireshark sugeridos:
 * - UDP: udp.port == 40000
 * - TCP: tcp.port == 5050
 */

import dgram from 'node:dgram';
import net from 'node:net';
import { once } from 'events';
import { CreateTestRequest, PacketProgress, TestSummary } from '../types/test.js';
import { TCP_PROBE_PORT, UDP_PROBE_PORT } from '../config.js';

/**
 * Callbacks para reportar progreso durante la prueba
 */
export interface TestRunCallbacks {
  /** Llamado por cada evento de paquete (sent/received/lost) */
  onPacket: (packet: PacketProgress, progress: number) => void;
  /** Llamado para mensajes de log opcionales */
  onLog?: (message: string) => void;
}

/**
 * Información de un paquete pendiente de respuesta
 */
interface PendingPacket {
  /** Timestamp de envío en ms */
  sentAt: number;
  /** Timer para marcar el paquete como perdido si no hay respuesta */
  timeout: NodeJS.Timeout;
}

/**
 * Función auxiliar para esperar un tiempo determinado
 * @param ms - Milisegundos a esperar
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decodifica el header JSON de un paquete recibido
 * El header está en la primera línea del buffer, separado por '\n'
 * 
 * @param buffer - Buffer del paquete recibido
 * @returns Header parseado con seq, testId y sentAt, o null si falla
 */
const decodeHeader = (buffer: Buffer) => {
  const newlineIndex = buffer.indexOf('\n');
  const headerChunk = newlineIndex >= 0 ? buffer.subarray(0, newlineIndex).toString('utf8') : buffer.toString('utf8');
  try {
    return JSON.parse(headerChunk) as { seq: number; testId: string; sentAt: string };
  } catch (error) {
    return null;
  }
};

/**
 * Crea un buffer de paquete con header JSON y padding
 * 
 * Formato del paquete:
 * - Primera línea: JSON con metadata (seq, testId, sentAt)
 * - Resto: Padding para alcanzar el tamaño especificado
 * 
 * @param payload - Metadata del paquete (seq, testId, sentAt)
 * @param packetSize - Tamaño total deseado del paquete en bytes
 * @returns Buffer del paquete listo para enviar
 */
const createPacketBuffer = (payload: { seq: number; testId: string; sentAt: string }, packetSize: number) => {
  const header = `${JSON.stringify(payload)}\n`;
  const headerBuffer = Buffer.from(header, 'utf8');
  const totalSize = Math.max(packetSize, headerBuffer.length);
  const packetBuffer = Buffer.alloc(totalSize);
  headerBuffer.copy(packetBuffer);
  return packetBuffer;
};

/**
 * Ejecuta una prueba de red completa
 * 
 * Esta es la función principal que coordina toda la prueba:
 * 1. Configura el protocolo (UDP o TCP)
 * 2. Envía paquetes según la configuración
 * 3. Recibe respuestas del agente remoto
 * 4. Calcula métricas (RTT, jitter, throughput, packet loss)
 * 5. Emite eventos de progreso via callbacks
 * 
 * @param testId - UUID único de la prueba
 * @param config - Configuración completa de la prueba
 * @param callbacks - Funciones para reportar progreso
 * @returns Promise con resumen y array de paquetes
 * 
 * @example
 * await runNetworkTest('test-123', {
 *   protocol: 'UDP',
 *   targetHost: '192.168.1.100',
 *   targetPort: 40000,
 *   packetCount: 100,
 *   packetSize: 64,
 *   intervalMs: 100
 * }, {
 *   onPacket: (packet, progress) => console.log(`${progress}%`),
 *   onLog: (msg) => console.log(msg)
 * });
 */
export const runNetworkTest = async (
  testId: string,
  config: CreateTestRequest,
  callbacks: TestRunCallbacks
): Promise<{ summary: TestSummary; packets: PacketProgress[] }> => {
  const packets: PacketProgress[] = [];
  const pending = new Map<number, PendingPacket>();
  const receivedRtts: number[] = [];
  const timeoutPerPacket = Math.max(config.intervalMs * 4, 2000);
  const startTime = Date.now();
  let completedCount = 0;

  /**
   * Emite un evento de paquete con progreso actualizado
   */
  const emitPacket = (packet: PacketProgress) => {
    packets[packet.seq - 1] = packet;
    const progress = completedCount / config.packetCount;
    callbacks.onPacket(packet, progress);
  };

  /**
   * Completa el procesamiento de un paquete (received o lost)
   * 
   * @param seq - Número de secuencia del paquete
   * @param status - Estado final: 'received' o 'lost'
   * @param rtt - Round-trip time en ms (solo para paquetes recibidos)
   */
  const completePacket = (seq: number, status: 'received' | 'lost', rtt?: number) => {
    const pendingPacket = pending.get(seq);
    if (!pendingPacket) return;
    clearTimeout(pendingPacket.timeout);
    pending.delete(seq);
    completedCount += 1;
    const packet: PacketProgress = {
      seq,
      status,
      rtt,
      sentAt: new Date(pendingPacket.sentAt).toISOString(),
      receivedAt: rtt ? new Date(pendingPacket.sentAt + rtt).toISOString() : undefined
    };
    if (status === 'lost') {
      packet.receivedAt = undefined;
    }
    if (rtt !== undefined) {
      receivedRtts.push(rtt);
    }
    emitPacket(packet);
  };

  /**
   * Loop de envío de paquetes
   * Envía paquetes secuencialmente respetando el intervalo configurado
   * 
   * @param sendPacket - Función que envía un paquete individual
   */
  const sendLoop = async (sendPacket: (seq: number) => Promise<void>) => {
    for (let seq = 1; seq <= config.packetCount; seq += 1) {
      if (seq > 1) {
        await wait(config.intervalMs);
      }
      await sendPacket(seq);
    }
  };

  /**
   * Promesa que se resuelve cuando todos los paquetes están completos
   * Coordina la ejecución de la prueba según el protocolo
   */
  const finalizePromise = new Promise<void>((resolve, reject) => {
    const checkCompletion = () => {
      if (completedCount >= config.packetCount) {
        resolve();
      }
    };

    const wrapComplete = (seq: number, status: 'received' | 'lost', rtt?: number) => {
      completePacket(seq, status, rtt);
      checkCompletion();
    };

    const run = async () => {
      if (config.protocol === 'UDP') {
        await runUdpTest(config, testId, pending, timeoutPerPacket, wrapComplete, sendLoop, callbacks);
      } else {
        await runTcpTest(config, testId, pending, timeoutPerPacket, wrapComplete, sendLoop, callbacks);
      }
    };

    run().catch((error) => {
      callbacks.onLog?.(`Error while running test: ${String(error)}`);
      reject(error);
    });
  });

  await finalizePromise;

  const endTime = Date.now();
  const durationMs = Math.max(endTime - startTime, 1);
  const receivedPackets = packets.filter((p) => p?.status === 'received');
  const lostPackets = packets.filter((p) => p?.status === 'lost');

  /**
   * Cálculo de métricas estadísticas
   * 
   * - avgLatency: Promedio de RTTs
   * - maxLatency: RTT máximo
   * - minLatency: RTT mínimo
   * - jitter: Variación promedio entre RTTs consecutivos
   * - throughput: Mbps basado en paquetes recibidos
   * - packetLoss: Porcentaje de paquetes perdidos
   * - totalDuration: Duración total de la prueba en segundos
   */
  const avgLatency = receivedRtts.length
    ? receivedRtts.reduce((acc, curr) => acc + curr, 0) / receivedRtts.length
    : 0;
  const maxLatency = receivedRtts.length ? Math.max(...receivedRtts) : 0;
  const minLatency = receivedRtts.length ? Math.min(...receivedRtts) : 0;
  const jitter = receivedRtts.length > 1
    ? receivedRtts.slice(1).reduce((acc, value, index) => acc + Math.abs(value - receivedRtts[index]), 0) /
      (receivedRtts.length - 1)
    : 0;
  const throughput = durationMs
    ? Number(((receivedPackets.length * config.packetSize * 8) / (durationMs / 1000) / 1_000_000).toFixed(3))
    : 0;
  const packetLoss = Number(((lostPackets.length / config.packetCount) * 100).toFixed(2));
  const summary: TestSummary = {
    avgLatency: Number(avgLatency.toFixed(2)),
    maxLatency: Number(maxLatency.toFixed(2)),
    minLatency: Number(minLatency.toFixed(2)),
    jitter: Number(jitter.toFixed(2)),
    throughput,
    packetLoss,
    totalDuration: Number((durationMs / 1000).toFixed(2))
  };

  return { summary, packets };
};

/**
 * Ejecuta una prueba de red usando protocolo UDP
 * 
 * Funcionamiento:
 * 1. Crea un socket UDP y espera respuestas
 * 2. Envía paquetes con headers JSON al agente remoto
 * 3. El agente hace echo de los paquetes
 * 4. Calcula RTT al recibir cada respuesta
 * 5. Marca paquetes como perdidos si timeout
 * 
 * @param config - Configuración de la prueba
 * @param testId - ID de la prueba
 * @param pending - Mapa de paquetes pendientes
 * @param timeoutPerPacket - Timeout en ms para considerar paquete perdido
 * @param completePacket - Callback para marcar paquete como completo
 * @param sendLoop - Función de loop de envío
 * @param callbacks - Callbacks de progreso
 */
const runUdpTest = async (
  config: CreateTestRequest,
  testId: string,
  pending: Map<number, PendingPacket>,
  timeoutPerPacket: number,
  completePacket: (seq: number, status: 'received' | 'lost', rtt?: number) => void,
  sendLoop: (sendPacket: (seq: number) => Promise<void>) => Promise<void>,
  callbacks: TestRunCallbacks
) => {
  const udpSocket = dgram.createSocket('udp4');
  
  /**
   * Manejador de mensajes UDP recibidos
   * Decodifica el header, valida el testId y calcula RTT
   * Filtro Wireshark: udp.port == 40000
   */
  udpSocket.on('message', (msg) => {
    const header = decodeHeader(msg);
    if (!header || header.testId !== testId) {
      return;
    }
    const pendingPacket = pending.get(header.seq);
    if (!pendingPacket) {
      return;
    }
    const rtt = Date.now() - pendingPacket.sentAt;
    completePacket(header.seq, 'received', rtt);
  });
  udpSocket.on('error', (err) => {
    callbacks.onLog?.(`UDP socket error: ${err.message}`);
  });
  udpSocket.bind();
  await once(udpSocket, 'listening');

  /**
   * Función para enviar un paquete UDP individual
   */
  const sendPacket = async (seq: number) => {
    const sentAt = Date.now();
    const payloadBuffer = createPacketBuffer({ seq, testId, sentAt: new Date(sentAt).toISOString() }, config.packetSize);
    const timeout = setTimeout(() => completePacket(seq, 'lost'), timeoutPerPacket);
    pending.set(seq, { sentAt, timeout });
    
    // Enviar paquete UDP al agente remoto
    // Los paquetes son fáciles de capturar en Wireshark (udp.port == 40000)
    await new Promise<void>((resolve, reject) => {
      udpSocket.send(payloadBuffer, config.targetPort || UDP_PROBE_PORT, config.targetHost, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    callbacks.onPacket(
      {
        seq,
        status: 'sent',
        sentAt: new Date(sentAt).toISOString()
      },
      seq / config.packetCount
    );
  };

  try {
    await sendLoop(sendPacket);
    await wait(timeoutPerPacket + 500);
  } finally {
    udpSocket.close();
  }
};

/**
 * Ejecuta una prueba de red usando protocolo TCP
 * 
 * Funcionamiento:
 * 1. Establece una conexión TCP con el agente remoto
 * 2. Envía paquetes con headers JSON sobre la conexión
 * 3. El agente hace echo de los paquetes
 * 4. Calcula RTT al recibir cada respuesta
 * 5. Marca paquetes como perdidos si timeout
 * 
 * Ventajas sobre UDP:
 * - Conexión confiable
 * - Orden garantizado de paquetes
 * 
 * @param config - Configuración de la prueba
 * @param testId - ID de la prueba
 * @param pending - Mapa de paquetes pendientes
 * @param timeoutPerPacket - Timeout en ms para considerar paquete perdido
 * @param completePacket - Callback para marcar paquete como completo
 * @param sendLoop - Función de loop de envío
 * @param callbacks - Callbacks de progreso
 */
const runTcpTest = async (
  config: CreateTestRequest,
  testId: string,
  pending: Map<number, PendingPacket>,
  timeoutPerPacket: number,
  completePacket: (seq: number, status: 'received' | 'lost', rtt?: number) => void,
  sendLoop: (sendPacket: (seq: number) => Promise<void>) => Promise<void>,
  callbacks: TestRunCallbacks
) => {
  const client = new net.Socket();
  client.setNoDelay(true);
  
  /**
   * Manejador de datos TCP recibidos
   * Decodifica el header, valida el testId y calcula RTT
   * Filtro Wireshark: tcp.port == 5050
   */
  client.on('data', (data) => {
    const header = decodeHeader(data);
    if (!header || header.testId !== testId) {
      return;
    }
    const pendingPacket = pending.get(header.seq);
    if (!pendingPacket) {
      return;
    }
    const rtt = Date.now() - pendingPacket.sentAt;
    completePacket(header.seq, 'received', rtt);
  });
  await new Promise<void>((resolve, reject) => {
    client.connect(config.targetPort || TCP_PROBE_PORT, config.targetHost, () => resolve());
    client.once('error', reject);
  });

  /**
   * Función para enviar un paquete TCP individual
   */
  const sendPacket = async (seq: number) => {
    const sentAt = Date.now();
    const buffer = createPacketBuffer({ seq, testId, sentAt: new Date(sentAt).toISOString() }, config.packetSize);
    const timeout = setTimeout(() => completePacket(seq, 'lost'), timeoutPerPacket);
    pending.set(seq, { sentAt, timeout });
    
    // Enviar paquete TCP al agente remoto
    // Los paquetes viajan sobre el puerto de prueba dedicado para capturas determinísticas
    await new Promise<void>((resolve, reject) => {
      client.write(buffer, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    callbacks.onPacket(
      {
        seq,
        status: 'sent',
        sentAt: new Date(sentAt).toISOString()
      },
      seq / config.packetCount
    );
  };

  try {
    await sendLoop(sendPacket);
    await wait(timeoutPerPacket + 500);
  } finally {
    client.end();
  }
};
