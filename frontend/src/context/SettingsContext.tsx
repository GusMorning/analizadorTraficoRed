/**
 * Contexto de Configuración de la Aplicación
 * 
 * Gestiona la configuración global de la aplicación incluyendo:
 * - URLs de API y WebSocket
 * - Configuración de servicios externos (CellMapper)
 * - Persistencia en localStorage
 * - Detección automática de URLs en desarrollo y producción
 * 
 * La configuración se guarda automáticamente en localStorage
 * y se carga al iniciar la aplicación.
 */

import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Configuración de la aplicación
 */
export interface AppSettings {
  /** URL base de la API REST (ej: http://localhost:4000/api) */
  apiBaseUrl: string;
  /** URL del servidor WebSocket (ej: http://localhost:4000) */
  wsUrl: string;
  /** Ruta del WebSocket en el servidor (ej: /ws) */
  wsPath: string;
  /** URL de CellMapper para visualización de antenas celulares */
  cellMapperUrl: string;
}

/**
 * Valor del contexto de configuración
 */
interface SettingsContextValue {
  /** Configuración actual */
  settings: AppSettings;
  /** Actualizar configuración parcialmente */
  updateSettings: (update: Partial<AppSettings>) => void;
}

/**
 * Infiere la configuración por defecto basada en el entorno
 * 
 * Orden de prioridad:
 * 1. Variables de entorno (VITE_API_BASE_URL, etc.)
 * 2. Auto-detección basada en window.location
 * 3. Valores por defecto (localhost:4000)
 * 
 * @returns Configuración inferida
 */
const inferDefaultSettings = (): AppSettings => {
  const envApi = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const envWs = import.meta.env.VITE_WS_URL as string | undefined;
  const envWsPath = (import.meta.env.VITE_WS_PATH as string | undefined) ?? '/ws';
  const envCellMapper = import.meta.env.VITE_CELL_MAPPER_URL as string | undefined;
  
  // URL por defecto de CellMapper (Lima, Perú como ejemplo)
  const defaultCellMapper =
    envCellMapper ??
    'https://www.cellmapper.net/map?MCC=716&MNC=10&type=LTE&latitude=-12.0464&longitude=-77.0428&zoom=12';

  // Si hay variables de entorno, usarlas directamente
  if (envApi && envWs) {
    return {
      apiBaseUrl: envApi.replace(/\/$/, ''),
      wsUrl: envWs.replace(/\/$/, ''),
      wsPath: envWsPath,
      cellMapperUrl: defaultCellMapper
    };
  }

  // Auto-detección basada en window.location
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const isDev = import.meta.env.DEV;
    let targetOrigin: string;

    if (isDev) {
      // En desarrollo: Vite dev server (5173) -> backend (4000)
      targetOrigin = `${protocol}//${hostname}:4000`;
    } else if (port && port !== '80' && port !== '443') {
      // En producción con puerto no estándar
      targetOrigin = `${protocol}//${hostname}:${port}`;
    } else {
      // En producción con puerto estándar
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

  // Fallback si no hay window (SSR)
  return {
    apiBaseUrl: 'http://localhost:4000/api',
    wsUrl: 'http://localhost:4000',
    wsPath: '/ws',
    cellMapperUrl: defaultCellMapper
  };
};

/** Configuración por defecto inferida */
const DEFAULT_SETTINGS = inferDefaultSettings();

/** Contexto de configuración */
const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => undefined
});

/** Clave para localStorage */
const STORAGE_KEY = 'network-lab-settings';

/**
 * Provider de configuración
 * 
 * Proporciona la configuración a toda la aplicación y persiste
 * los cambios en localStorage automáticamente.
 * 
 * @param children - Componentes hijos
 */
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    // Cargar configuración guardada de localStorage
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  });

  // Guardar en localStorage cuando cambie la configuración
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  /**
   * Actualiza la configuración parcialmente
   * @param update - Campos a actualizar
   */
  const updateSettings = (update: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...update }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * Hook para acceder a la configuración
 * @returns Configuración actual y función para actualizarla
 * @throws Error si se usa fuera del SettingsProvider
 */
export const useSettings = () => useContext(SettingsContext);
