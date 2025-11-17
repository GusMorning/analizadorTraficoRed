/**
 * Contexto de Comunicación en Tiempo Real
 * 
 * Gestiona la conexión WebSocket (Socket.IO) con el backend
 * para recibir actualizaciones en tiempo real de:
 * - Progreso de pruebas en ejecución
 * - Estado de agentes remotos
 * - Logs y eventos del sistema
 * 
 * La conexión se establece automáticamente al montar el provider
 * y se limpia al desmontarlo. Se reconecta automáticamente si
 * la configuración de WebSocket cambia.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { useSettings } from './SettingsContext';

/**
 * Valor del contexto de tiempo real
 */
interface RealtimeContextValue {
  /** Instancia del socket Socket.IO, o null si no está conectado */
  socket: Socket | null;
}

/** Contexto de tiempo real */
const RealtimeContext = createContext<RealtimeContextValue>({ socket: null });

/**
 * Provider de comunicación en tiempo real
 * 
 * Establece y mantiene la conexión WebSocket con el backend.
 * La conexión se actualiza automáticamente si cambian las URLs
 * en la configuración.
 * 
 * Eventos disponibles (ejemplos):
 * - 'connected': Confirmación de conexión
 * - 'test-started': Una prueba ha iniciado
 * - 'test-progress': Progreso de prueba en curso
 * - 'test-complete': Una prueba ha finalizado
 * - 'test-error': Error en una prueba
 * - 'agent-status': Estado de agente remoto
 * 
 * @param children - Componentes hijos
 * 
 * @example
 * const { socket } = useRealtime();
 * useEffect(() => {
 *   if (!socket) return;
 *   socket.on('test-progress', (data) => {
 *     console.log('Progress:', data);
 *   });
 * }, [socket]);
 */
export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Crear nueva conexión Socket.IO
    const ioClient = io(settings.wsUrl, {
      path: settings.wsPath,
      transports: ['websocket'] // Solo WebSocket, sin polling
    });
    
    setSocket(ioClient);
    
    // Limpiar conexión al desmontar o cambiar configuración
    return () => ioClient.disconnect();
  }, [settings.wsUrl, settings.wsPath]);

  return <RealtimeContext.Provider value={{ socket }}>{children}</RealtimeContext.Provider>;
};

/**
 * Hook para acceder al socket de tiempo real
 * 
 * @returns Socket.IO client instance
 * @throws Error si se usa fuera del RealtimeProvider
 * 
 * @example
 * const { socket } = useRealtime();
 * useEffect(() => {
 *   if (!socket) return;
 *   socket.on('my-event', handler);
 *   return () => socket.off('my-event', handler);
 * }, [socket]);
 */
export const useRealtime = () => useContext(RealtimeContext);
