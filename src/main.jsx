import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import ErrorBoundary from './components/core/ErrorBoundary.jsx';
import 'leaflet/dist/leaflet.css';
import { registerSW } from 'virtual:pwa-register';
import { initDB } from './services/idbService';

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (confirm('Critical AGWA System Update Available. Reload to apply deployment changes?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('AGWA PWA Offline Subsystem Activated. 100% Ready for field deployment routing and searches.');
  },
  onRegisterError(error) {
    console.error('AGWA PWA Service Worker Registration Failed:', error);
  }
});

initDB().then(() => {
  console.log("AGWA IndexedDB Offline Storage Initialized");
}).catch(err => {
  console.error("AGWA IndexedDB Initialization Failed", err);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);