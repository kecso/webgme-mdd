import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { WebGmeBridge } from './control/WebGmeBridge.js';
import './styles/studio.css';

function getMountedPath() {
  const mountElm = document.getElementById('mounted-path');
  if (mountElm && mountElm.getAttribute('content')) {
    return mountElm.getAttribute('content');
  }
  return '';
}

function renderApp(basename) {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter basename={basename || undefined}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

const mountedPath = getMountedPath();

// webgme-dss pattern: engine calls onGMEInit after webgme.classes loads.
window.onGMEInit = () => {
  WebGmeBridge.bootstrapFromGmeInit(mountedPath)
    .then(() => {
      renderApp(mountedPath || undefined);
    })
    .catch((err) => {
      console.error('WebGME init failed; falling back to demo mode', err);
      renderApp(mountedPath || undefined);
    });
};

// Vite-only / demo: no webgme.classes → render immediately without gmeClient.
if (typeof window.GME === 'undefined') {
  WebGmeBridge.connect().finally(() => {
    renderApp(undefined);
  });
}
