import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { browserApi } from './mock/browserApi';

// Fallback to browserApi if window.api is not provided by Electron (e.g. previewing in standard browser)
if (typeof window !== 'undefined' && !window.api) {
  console.info('[TimeTracker] Electron API not detected. Initializing browser preview storage.');
  window.api = browserApi;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
