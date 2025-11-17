import { createContext, useContext, useEffect, useState } from 'react';

export interface AppSettings {
  apiBaseUrl: string;
  wsUrl: string;
  wsPath: string;
  cellMapperUrl: string;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (update: Partial<AppSettings>) => void;
}

const inferDefaultSettings = (): AppSettings => {
  const envApi = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const envWs = import.meta.env.VITE_WS_URL as string | undefined;
  const envWsPath = (import.meta.env.VITE_WS_PATH as string | undefined) ?? '/ws';
  const envCellMapper = import.meta.env.VITE_CELL_MAPPER_URL as string | undefined;
  const defaultCellMapper =
    envCellMapper ??
    'https://www.cellmapper.net/map?MCC=716&MNC=10&type=LTE&latitude=-12.0464&longitude=-77.0428&zoom=12';

  if (envApi && envWs) {
    return {
      apiBaseUrl: envApi.replace(/\/$/, ''),
      wsUrl: envWs.replace(/\/$/, ''),
      wsPath: envWsPath,
      cellMapperUrl: defaultCellMapper
    };
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const isDev = import.meta.env.DEV;
    let targetOrigin: string;

    if (isDev) {
      // Vite dev server (5173) -> backend (4000)
      targetOrigin = `${protocol}//${hostname}:4000`;
    } else if (port && port !== '80' && port !== '443') {
      targetOrigin = `${protocol}//${hostname}:${port}`;
    } else {
      targetOrigin = `${protocol}//${hostname}`;
    }

    const normalizedOrigin = targetOrigin.replace(/\/$/, '');

    return {
      apiBaseUrl: `${normalizedOrigin}/api`,
      wsUrl: normalizedOrigin,
      wsPath: envWsPath,
      cellMapperUrl: defaultCellMapper
    };
  }

  return {
    apiBaseUrl: 'http://localhost:4000/api',
    wsUrl: 'http://localhost:4000',
    wsPath: '/ws',
    cellMapperUrl: defaultCellMapper
  };
};

const DEFAULT_SETTINGS = inferDefaultSettings();

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => undefined
});

const STORAGE_KEY = 'network-lab-settings';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (update: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...update }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
