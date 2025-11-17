import { createContext, useContext, useEffect, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { useSettings } from './SettingsContext';

interface RealtimeContextValue {
  socket: Socket | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({ socket: null });

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const ioClient = io(settings.wsUrl, {
      path: settings.wsPath,
      transports: ['websocket']
    });
    setSocket(ioClient);
    return () => ioClient.disconnect();
  }, [settings.wsUrl, settings.wsPath]);

  return <RealtimeContext.Provider value={{ socket }}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = () => useContext(RealtimeContext);
