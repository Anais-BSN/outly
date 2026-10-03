// ============================================================================
// 1. Intercepteur global systématique de window.fetch pour l'environnement mobile
// ============================================================================
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let urlString = '';
    let isRequestInstance = false;

    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (typeof Request !== 'undefined' && input instanceof Request) {
      urlString = input.url;
      isRequestInstance = true;
    }

    // Détection de l'environnement mobile / Capacitor / localhost
    const isCapacitor = Boolean(
      (window as any).Capacitor?.isNativePlatform?.() ||
      (window as any).Capacitor?.getPlatform?.() !== 'web' ||
      (window as any).Capacitor
    );
    const origin = window.location.origin || '';
    const isLocalhostEnv =
      origin.startsWith('http://localhost') ||
      origin.startsWith('https://localhost') ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://') ||
      origin.startsWith('file://');

    let targetUrl = urlString;

    // Réécriture systématique de toute URL relative ou locale vers l'API de production
    if (urlString.startsWith('/api')) {
      targetUrl = `https://www.outlys.fr${urlString}`;
    } else if (urlString.startsWith('api/')) {
      targetUrl = `https://www.outlys.fr/${urlString}`;
    } else if (
      urlString.includes('localhost/api') ||
      urlString.includes('localhost:5173/api') ||
      urlString.includes('localhost:3000/api') ||
      urlString.includes('127.0.0.1/api') ||
      urlString.includes('capacitor://localhost/api') ||
      urlString.includes('ionic://localhost/api')
    ) {
      targetUrl = urlString.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api/, 'https://www.outlys.fr/api')
                           .replace(/^capacitor:\/\/localhost\/api/, 'https://www.outlys.fr/api')
                           .replace(/^ionic:\/\/localhost\/api/, 'https://www.outlys.fr/api');
    }

    // Affichage systématique du log pour traçage immédiat
    console.log('[API Call]', targetUrl);

    if (targetUrl !== urlString) {
      if (isRequestInstance) {
        const newRequest = new Request(targetUrl, input as Request);
        return originalFetch(newRequest, init);
      }
      return originalFetch(targetUrl, init);
    }

    return originalFetch(input, init);
  };
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
