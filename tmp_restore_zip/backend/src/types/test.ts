export type NetworkMode = 'LAN' | 'REMOTE';
export type ProtocolType = 'UDP' | 'TCP';

export interface TestMetadata {
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

export interface PacketProgress {
  seq: number;
  status: 'sent' | 'received' | 'lost';
  rtt?: number;
  sentAt: string;
  receivedAt?: string;
}

export interface TestSummary {
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  jitter: number;
  throughput: number;
  packetLoss: number;
  totalDuration: number;
}

export interface TestRecord extends TestMetadata, TestSummary {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
}

export interface TestResult extends TestRecord {
  packets: PacketProgress[];
}

export interface CreateTestRequest extends TestMetadata {}
