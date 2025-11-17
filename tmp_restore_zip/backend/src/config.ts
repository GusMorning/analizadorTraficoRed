export const API_PORT = Number(process.env.API_PORT ?? 4000);
export const WS_PATH = '/ws';
export const UDP_PROBE_PORT = Number(process.env.UDP_PROBE_PORT ?? 40000); // Suggested Wireshark filter: udp.port == 40000
export const TCP_PROBE_PORT = Number(process.env.TCP_PROBE_PORT ?? 5050); // Suggested Wireshark filter: tcp.port == 5050
export const DEFAULT_WS_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
