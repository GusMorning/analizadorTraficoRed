import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import testRoutes from './routes/testRoutes.js';
import { API_PORT, DEFAULT_WS_ORIGIN, WS_PATH } from './config.js';
import { registerSocket } from './services/testService.js';

const app = express();
app.use(cors({ origin: DEFAULT_WS_ORIGIN === '*' ? true : DEFAULT_WS_ORIGIN }));
app.use(express.json());

app.use('/api', testRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  path: WS_PATH,
  cors: { origin: DEFAULT_WS_ORIGIN === '*' ? true : DEFAULT_WS_ORIGIN }
});
registerSocket(io);

io.on('connection', (socket) => {
  socket.emit('connected', { message: 'Socket listo para métricas en vivo' });
  socket.on('agent-online', (payload) => {
    io.emit('agent-status', { ...payload, connectedAt: new Date().toISOString() });
  });
});

httpServer.listen(API_PORT, () => {
  console.log(`API server listening on http://localhost:${API_PORT}`);
  console.log(`WebSocket path: ${WS_PATH}`);
});
