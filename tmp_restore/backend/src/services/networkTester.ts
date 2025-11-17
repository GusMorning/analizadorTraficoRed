import dgram from 'node:dgram';
import net from 'node:net';
import { once } from 'events';
import { CreateTestRequest, PacketProgress, TestSummary } from '../types/test.js';
import { TCP_PROBE_PORT, UDP_PROBE_PORT } from '../config.js';

export interface TestRunCallbacks {
  onPacket: (packet: PacketProgress, progress: number) => void;
  onLog?: (message: string) => void;
}

interface PendingPacket {
  sentAt: number;
  timeout: NodeJS.Timeout;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeHeader = (buffer: Buffer) => {
  const newlineIndex = buffer.indexOf('\n');
  const headerChunk = newlineIndex >= 0 ? buffer.subarray(0, newlineIndex).toString('utf8') : buffer.toString('utf8');
  try {
    return JSON.parse(headerChunk) as { seq: number; testId: string; sentAt: string };
  } catch (error) {
    return null;
  }
};

const createPacketBuffer = (payload: { seq: number; testId: string; sentAt: string }, packetSize: number) => {
  const header = `${JSON.stringify(payload)}\n`;
  const headerBuffer = Buffer.from(header, 'utf8');
  const totalSize = Math.max(packetSize, headerBuffer.length);
  const packetBuffer = Buffer.alloc(totalSize);
  headerBuffer.copy(packetBuffer);
  return packetBuffer;
};

// Core runner responsible for sending/receiving the probe packets.
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

  const emitPacket = (packet: PacketProgress) => {
    packets[packet.seq - 1] = packet;
    const progress = completedCount / config.packetCount;
    callbacks.onPacket(packet, progress);
  };

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

  const sendLoop = async (sendPacket: (seq: number) => Promise<void>) => {
    for (let seq = 1; seq <= config.packetCount; seq += 1) {
      if (seq > 1) {
        await wait(config.intervalMs);
      }
      await sendPacket(seq);
    }
  };

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

  // Summary metrics are calculated here so that the dashboard only needs to read from SQLite.
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
  // Incoming UDP packets from the remote agent land here (filter in Wireshark with udp.port == 40000 by default).
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

  const sendPacket = async (seq: number) => {
    const sentAt = Date.now();
    const payloadBuffer = createPacketBuffer({ seq, testId, sentAt: new Date(sentAt).toISOString() }, config.packetSize);
    const timeout = setTimeout(() => completePacket(seq, 'lost'), timeoutPerPacket);
    pending.set(seq, { sentAt, timeout });
    // Probe packets are sent over UDP so they are easy to sniff (udp.port == 40000).
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
  // Incoming TCP echoes are handled here (filter with tcp.port == 5050 in Wireshark).
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

  const sendPacket = async (seq: number) => {
    const sentAt = Date.now();
    const buffer = createPacketBuffer({ seq, testId, sentAt: new Date(sentAt).toISOString() }, config.packetSize);
    const timeout = setTimeout(() => completePacket(seq, 'lost'), timeoutPerPacket);
    pending.set(seq, { sentAt, timeout });
    // TCP probes travel over the dedicated test port for deterministic captures.
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
