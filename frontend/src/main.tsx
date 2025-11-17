/**
 * Punto de Entrada de la App React
 * 
 * Acá arranca todo. Montamos la app con todos sus "envolturas" (providers)
 * que le dan superpoderes a la aplicación:
 * 
 * - React.StrictMode: Modo estricto que nos avisa de cosas raras en desarrollo
 * - SettingsProvider: Maneja toda la config (URLs del servidor, etc.)
 * - RealtimeProvider: Conexión WebSocket para updates en vivo
 * - BrowserRouter: Maneja las rutas (URLs) de la aplicación
 * 
 * También cargamos los estilos globales:
 * - Tailwind CSS: Para que todo se vea bonito sin escribir mucho CSS
 * - Leaflet: Para los mapas (si usas geolocalización)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { SettingsProvider } from './context/SettingsContext';
import { RealtimeProvider } from './context/RealtimeContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <RealtimeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </RealtimeProvider>
    </SettingsProvider>
  </React.StrictMode>
);
