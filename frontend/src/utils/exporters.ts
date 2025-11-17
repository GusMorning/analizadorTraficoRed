import { PacketProgress, TestDetail } from '../types/test';

const downloadFile = (content: BlobPart, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportPacketsToCsv = (test: TestDetail) => {
  const headers = ['seq', 'status', 'sentAt', 'receivedAt', 'rtt'];
  const rows = test.packets
    .map((packet) => [packet.seq, packet.status, packet.sentAt, packet.receivedAt ?? '', packet.rtt ?? ''])
    .map((cols) => cols.join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `${test.name}-packets.csv`, 'text/csv');
};

export const exportTestToJson = (test: TestDetail) => {
  downloadFile(JSON.stringify(test, null, 2), `${test.name}-detallado.json`, 'application/json');
};
