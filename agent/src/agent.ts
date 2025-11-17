/**
 * Agente del Laboratorio de Redes
 * 
 * Básicamente este archivo es como un "eco inteligente" que rebota los paquetes
 * que le llegan. Lo instalamos en una compu remota y cuando nuestro servidor le
 * manda paquetes, este los devuelve de vuelta. Así podemos medir cuánto tarda
 * el viaje de ida y vuelta (eso que llaman RTT).
 * 
 * ¿Qué hace?
 * - Escucha paquetes UDP en un puerto y los devuelve al que los mandó
 * - Hace lo mismo pero con TCP (que es más confiable)
 * - Se conecta al servidor principal para avisar que está online
 * 
 * Variables que puedes configurar con variables de entorno:
 * - UDP_PORT: En qué puerto escucha UDP (por defecto 40000)
 * - TCP_PORT: En qué puerto escucha TCP (por defecto 5050)
 * - SERVER_URL: La dirección del servidor principal
 * - WS_PATH: La ruta del WebSocket (por defecto /ws)
 * - AGENT_ID: Un nombre para identificar este agente
 */

import dgram from 'node:dgram';
import net from 'node:net';
import os from 'node:os';
import { io as createClient } from 'socket.io-client';

// Puerto donde escuchamos los paquetes UDP
const UDP_PORT = Number(process.env.UDP_PORT ?? 40000);

// Puerto donde escuchamos conexiones TCP
const TCP_PORT = Number(process.env.TCP_PORT ?? 5050);

// URL del servidor (si no la pones, igual funciona pero sin reportar estado)
const SERVER_URL = process.env.SERVER_URL;

// Ruta del WebSocket en el servidor
const WS_PATH = process.env.WS_PATH ?? '/ws';

// ID de este agente (si no pones uno, usa el nombre de la compu)
const agentId = process.env.AGENT_ID ?? `agent-${os.hostname()}`;

/**
 * Servidor de Eco UDP
 * 
 * Esto es súper simple: recibe un paquete UDP y lo manda de vuelta al que
 * lo envió. Es como jugar a la pelota - te tiro la pelota y me la devuelves.
 * Con esto podemos medir cuánto tarda en ir y volver.
 * 
 * Pro tip: Si quieres ver los paquetes en Wireshark, filtra por: udp.port == 40000
 */
const udpSocket = dgram.createSocket('udp4');
udpSocket.on('message', (msg, rinfo) => {
  // Recibimos un mensaje, lo mandamos de vuelta
  udpSocket.send(msg, rinfo.port, rinfo.address);
});
udpSocket.bind(UDP_PORT, () => {
  console.log(`🎯 Agente UDP escuchando en el puerto ${UDP_PORT}`);
});

/**
 * Servidor de Eco TCP
 * 
 * Igual que el UDP pero usa TCP. La diferencia es que TCP es más "formal":
 * primero establece una conexión y se asegura de que todo llegue bien.
 * Es como hacer una llamada vs mandar un mensaje - TCP es la llamada.
 * 
 * Pro tip Wireshark: tcp.port == 5050
 */
const tcpServer = net.createServer((socket) => {
  socket.on('data', (data) => {
    // Nos llegan datos, los devolvemos tal cual
    socket.write(data);
  });
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`🎯 Agente TCP escuchando en el puerto ${TCP_PORT}`);
});

/**
 * Conexión al Servidor Principal (Opcional)
 * 
 * Si configuraste la URL del servidor, nos conectamos y le avisamos que
 * estamos online. Así el servidor sabe que puede usar este agente para
 * hacer pruebas. Si no pones URL, igual funciona pero solo localmente.
 */
if (SERVER_URL) {
  const socket = createClient(SERVER_URL, {
    path: WS_PATH,
    transports: ['websocket']
  });
  socket.on('connect', () => {
    socket.emit('agent-online', { agentId, udpPort: UDP_PORT, tcpPort: TCP_PORT });
    console.log(`✅ Conectado al servidor ${SERVER_URL}${WS_PATH}`);
  });
  socket.on('disconnect', () => {
    console.log('❌ Desconectado del servidor');
  });
} else {
  console.log('ℹ️  No hay SERVER_URL. El agente funcionará solo en modo local.');
}
