import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { SettingsProvider } from './context/SettingsContext';
import { RealtimeProvider } from './context/RealtimeContext';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(SettingsProvider, { children: _jsx(RealtimeProvider, { children: _jsx(BrowserRouter, { children: _jsx(App, {}) }) }) }) }));
