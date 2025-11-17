import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSettings } from './SettingsContext';
const RealtimeContext = createContext({ socket: null });
export const RealtimeProvider = ({ children }) => {
    const { settings } = useSettings();
    const [socket, setSocket] = useState(null);
    useEffect(() => {
        const ioClient = io(settings.wsUrl, {
            path: settings.wsPath,
            transports: ['websocket']
        });
        setSocket(ioClient);
        return () => ioClient.disconnect();
    }, [settings.wsUrl, settings.wsPath]);
    return _jsx(RealtimeContext.Provider, { value: { socket }, children: children });
};
export const useRealtime = () => useContext(RealtimeContext);
