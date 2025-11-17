/**
 * Servidor Principal del Backend
 * 
 * Este es el corazón de todo el sistema. Acá levantamos:
 * - Un servidor Express para la API REST (recibe peticiones HTTP normales)
 * - Un servidor WebSocket para mandar updates en tiempo real
 * - Las rutas para hacer todas las operaciones (crear pruebas, ver historial, etc.)
 * 
 * Endpoints que tenemos:
 * - /api/tests: Todo lo relacionado con las pruebas (crear, ver, listar)
 * - /api/scan: Escanear dispositivos en tu red
 * - /api/port-scan: Ver qué puertos tiene abiertos un dispositivo
 * - /api/speedtest: Medir tu velocidad de internet
 * - /health: Para ver si el servidor está funcionando
 * 
 * Eventos de WebSocket (para updates en vivo):
 * - test-started: Cuando arranca una prueba
 * - test-progress: Progreso mientras corre la prueba
 * - test-complete: Cuando termina todo
 * - test-error: Si algo salió mal
 * - agent-status: Estado de los agentes conectados
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import testRoutes from './routes/testRoutes.js';
import { API_PORT, DEFAULT_WS_ORIGIN, WS_PATH } from './config.js';
import { registerSocket } from './services/testService.js';

// Configuramos Express (el framework para manejar las peticiones web)
const app = express();

// CORS permite que el frontend pueda hablar con el backend
app.use(cors({ origin: DEFAULT_WS_ORIGIN === '*' ? true : DEFAULT_WS_ORIGIN }));

// Esto es para poder recibir JSON en las peticiones
app.use(express.json());

// Todas nuestras rutas de API empiezan con /api
app.use('/api', testRoutes);

/**
 * Endpoint de salud
 * 
 * Es como un "hola, ¿estás ahí?" para el servidor.
 * Útil para monitoreo o para saber si el backend está corriendo.
 */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Creamos el servidor HTTP y le agregamos Socket.IO para WebSockets
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  path: WS_PATH,
  cors: { origin: DEFAULT_WS_ORIGIN === '*' ? true : DEFAULT_WS_ORIGIN }
});

// Registramos el Socket.IO para que los servicios puedan mandar eventos
registerSocket(io);

/**
 * Manejador de conexiones WebSocket
 * 
 * Cada vez que alguien se conecta (el frontend, por ejemplo), entra acá.
 * Le mandamos un mensaje de bienvenida y nos preparamos para escuchar eventos.
 */
io.on('connection', (socket) => {
  // Le decimos al cliente que se conectó correctamente
  socket.emit('connected', { message: 'Socket listo para métricas en vivo' });
  
  // Si un agente remoto se conecta, avisamos a todos los clientes
  socket.on('agent-online', (payload) => {
    io.emit('agent-status', { ...payload, connectedAt: new Date().toISOString() });
  });
});

// Arrancamos el servidor y lo ponemos a escuchar
httpServer.listen(API_PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${API_PORT}`);
  console.log(`📡 WebSocket disponible en: ${WS_PATH}`);
});
