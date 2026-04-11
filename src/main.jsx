import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import ErrorBoundary from './components/core/ErrorBoundary.jsx';
import 'leaflet/dist/leaflet.css';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New system update available. Reload to apply changes?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Offline PWA mode active. Ready for fieldwork.');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);