import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server',
        async configureServer(server) {
          const { app } = await import('./server/app');
          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?'))) {
              app(req as any, res as any, next);
            } else {
              next();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_PUSHER_KEY': JSON.stringify(process.env.VITE_PUSHER_KEY || 'ffb22ce4e830df75afc1'),
      'import.meta.env.VITE_PUSHER_CLUSTER': JSON.stringify(process.env.VITE_PUSHER_CLUSTER || 'eu'),
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});