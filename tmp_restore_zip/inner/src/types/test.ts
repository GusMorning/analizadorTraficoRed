export type NetworkMode = 'LAN' | 'REMOTE';
export type ProtocolType = 'UDP' | 'TCP';

export interface TestRecord {
  id: string;
  name: string;
  mode: NetworkMode;
  targetHost: string;
  targetPort: number;
  protocol: ProtocolType;
  packetSize: number;
  packetCount: number;
  intervalMs: number;
  networkType: string;
  provider: string;
  location: string;
  device: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  jitter: number;
  throughput: number;
  packetLoss: number;
  totalDuration: number;
}

export interface PacketProgress {
  seq: number;
  status: 'sent' | 'received' | 'lost';
  rtt?: number;
  sentAt: string;
  receivedAt?: string;
}

export interface TestDetail extends TestRecord {
  packets: PacketProgress[];
}

export interface CreateTestPayload {
  name: string;
  mode: NetworkMode;
  targetHost: string;
  targetPort: number;
  protocol: ProtocolType;
  packetSize: number;
  packetCount: number;
  intervalMs: number;
  networkType: string;
  provider: string;
  location: string;
  device: string;
}
