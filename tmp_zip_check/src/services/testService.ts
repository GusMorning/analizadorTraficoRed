import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { CreateTestRequest, PacketProgress, TestRecord, TestResult } from '../types/test.js';
import { runNetworkTest } from './networkTester.js';

let io: Server | null = null;

export const registerSocket = (instance: Server) => {
  io = instance;
};

const insertTestStmt = db.prepare(`
  INSERT INTO tests (
    id, name, mode, targetHost, targetPort, protocol,
    packetSize, packetCount, intervalMs, networkType,
    provider, location, device, status, createdAt
  ) VALUES (@id, @name, @mode, @targetHost, @targetPort, @protocol,
    @packetSize, @packetCount, @intervalMs, @networkType,
    @provider, @location, @device, @status, @createdAt)
`);

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

const getTestsStmt = db.prepare('SELECT * FROM tests ORDER BY datetime(createdAt) DESC');
const getTestByIdStmt = db.prepare('SELECT * FROM tests WHERE id = ?');
const insertPacketStmt = db.prepare(`
  INSERT INTO packet_results (testId, seq, sentAt, receivedAt, rtt, status)
  VALUES (@testId, @seq, @sentAt, @receivedAt, @rtt, @status)
`);
const getPacketsStmt = db.prepare('SELECT * FROM packet_results WHERE testId = ? ORDER BY seq ASC');

export const createTest = async (payload: CreateTestRequest) => {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const defaults = {
    networkType: payload.networkType ?? 'Desconocida',
    provider: payload.provider ?? 'N/A',
    location: payload.location ?? 'N/A',
    device: payload.device ?? 'N/A'
  };
  insertTestStmt.run({
    id,
    ...payload,
    ...defaults,
    status: 'running',
    createdAt
  });

  io?.emit('test-started', { id, name: payload.name, createdAt });

  runNetworkTest(id, payload, {
    onPacket: (packet, progress) => {
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
      io?.emit('test-progress', { testId: id, packet, progress });
    },
    onLog: (message) => {
      io?.emit('test-log', { testId: id, message });
    }
  })
    .then(({ summary }) => {
      updateTestSummaryStmt.run({
        id,
        status: 'completed',
        ...summary
      });
      io?.emit('test-complete', { testId: id, summary });
    })
    .catch((error) => {
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
    device: row.device,
    status: row.status,
    createdAt: row.createdAt,
    avgLatency: row.avgLatency ?? 0,
    maxLatency: row.maxLatency ?? 0,
    minLatency: row.minLatency ?? 0,
    jitter: row.jitter ?? 0,
    throughput: row.throughput ?? 0,
    packetLoss: row.packetLoss ?? 0,
    totalDuration: row.totalDuration ?? 0
  }));
};

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
    status: row.status,
    createdAt: row.createdAt,
    avgLatency: row.avgLatency ?? 0,
    maxLatency: row.maxLatency ?? 0,
    minLatency: row.minLatency ?? 0,
    jitter: row.jitter ?? 0,
    throughput: row.throughput ?? 0,
    packetLoss: row.packetLoss ?? 0,
    totalDuration: row.totalDuration ?? 0,
    packets
  };
};
