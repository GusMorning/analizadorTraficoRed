export type NetworkMode = 'LAN' | 'REMOTE';
export type ProtocolType = 'UDP' | 'TCP';

export interface SpeedtestSnapshot {
  ping: number;
  download: number;
  upload: number;
  isp: string;
  server: string;
  timestamp: string;
}

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
  latitude?: number | null;
  longitude?: number | null;
  device: string;
  signalStrength: string;
  internetDirection: string;
  bandFrequency: string;
  distanceDescription: string;
  plan: string;
  signalSource: string;
  interpretationNotes?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  jitter: number;
  throughput: number;
  packetLoss: number;
  totalDuration: number;
  speedtest?: SpeedtestSnapshot | null;
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
  latitude?: number | null;
  longitude?: number | null;
  device: string;
  signalStrength: string;
  internetDirection: string;
  bandFrequency: string;
  distanceDescription: string;
  plan: string;
  signalSource: string;
  interpretationNotes?: string;
  speedtest?: SpeedtestSnapshot | null;
}

export interface FingDevice {
  ip: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  state?: string;
}

export interface ScanResult {
  target: string;
  devices: FingDevice[];
  rawOutput?: string;
}

export interface PortScanEntry {
  port: number;
  protocol: string;
  state: string;
  service?: string;
}

export interface PortScanResult {
  target: string;
  range: string;
  ports: PortScanEntry[];
  rawOutput?: string;
}
