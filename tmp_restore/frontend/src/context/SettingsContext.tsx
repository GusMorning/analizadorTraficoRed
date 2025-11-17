import { createContext, useContext, useEffect, useState } from 'react';

export interface AppSettings {
  apiBaseUrl: string;
  wsUrl: string;
  wsPath: string;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (update: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: 'http://localhost:4000/api',
  wsUrl: 'http://localhost:4000',
  wsPath: '/ws'
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => undefined
});

const STORAGE_KEY = 'network-lab-settings';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
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
