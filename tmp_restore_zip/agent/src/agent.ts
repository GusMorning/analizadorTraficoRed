import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';
import { io as createClient } from 'socket.io-client';

const UDP_PORT = Number(process.env.UDP_PORT ?? 40000);
const TCP_PORT = Number(process.env.TCP_PORT ?? 5050);
const SERVER_URL = process.env.SERVER_URL;
const WS_PATH = process.env.WS_PATH ?? '/ws';
const agentId = process.env.AGENT_ID ?? `agent-${os.hostname()}`;

const udpSocket = dgram.createSocket('udp4');
udpSocket.on('message', (msg, rinfo) => {
  // Echo the UDP payloads back to the lab server; sniff with "udp.port == 40000".
  udpSocket.send(msg, rinfo.port, rinfo.address);
});
udpSocket.bind(UDP_PORT, () => {
  console.log(`UDP echo agent listening on port ${UDP_PORT}`);
});

const tcpServer = net.createServer((socket) => {
  socket.on('data', (data) => {
    // TCP echo to complete the RTT measurement (filter with "tcp.port == 5050").
    socket.write(data);
  });
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`TCP echo agent listening on port ${TCP_PORT}`);
});

if (SERVER_URL) {
  const socket = createClient(SERVER_URL, {
    path: WS_PATH,
    transports: ['websocket']
  });
  socket.on('connect', () => {
    socket.emit('agent-online', { agentId, udpPort: UDP_PORT, tcpPort: TCP_PORT });
    console.log(`Connected to controller ${SERVER_URL}${WS_PATH}`);
  });
  socket.on('disconnect', () => {
    console.log('Disconnected from controller');
  });
} else {
  console.log('SERVER_URL not provided. Agent will only echo packets locally.');
}
