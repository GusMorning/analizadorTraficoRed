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
  signalStrength: string;
  internetDirection: string;
  bandFrequency: string;
  distanceDescription: string;
  plan: string;
  signalSource: string;
  interpretationNotes?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SpeedtestSnapshot {
  ping: number;
  download: number;
  upload: number;
  isp: string;
  server: string;
  timestamp: string;
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
  speedtest?: SpeedtestSnapshot | null;
}

export interface TestResult extends TestRecord {
  packets: PacketProgress[];
}

export interface CreateTestRequest extends TestMetadata {
  speedtest?: SpeedtestSnapshot;
}
