/**
 * App Principal
 * 
 * Este es el componente raíz que define todas las rutas de la aplicación.
 * Básicamente es el "mapa" que dice qué página mostrar según la URL.
 * 
 * Rutas disponibles:
 * - / : La página principal (Dashboard) con las estadísticas
 * - /new-test : Formulario para crear y correr una nueva prueba
 * - /history : Ver el historial de todas las pruebas que hiciste
 * - /settings : Configurar URLs del servidor y cosas así
 * - /help : Documentación y ayuda
 */

import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import NewTestPage from './pages/NewTestPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';

const App = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/new-test" element={<NewTestPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/help" element={<HelpPage />} />
    </Route>
  </Routes>
);

export default App;
