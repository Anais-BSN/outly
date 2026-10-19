import express from 'express';
import dotenv from 'dotenv';
import { apiRouter } from './api';
import { corsMiddleware } from './cors';

dotenv.config();

export const app = express();

// Middleware de sécurité CORS
app.use(corsMiddleware);

// En-têtes de sécurité de base pour Express
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  next();
});

// Durcissement de sécurité : Désinfection récursive interdisant strictement password et password_hash
app.use((_req, res, next) => {
  const originalJson = res.json;
  res.json = function (body: any) {
    const sanitize = (val: any): any => {
      if (!val || typeof val !== 'object') return val;
      if (Array.isArray(val)) return val.map(sanitize);
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        if (/^(password|password_hash|passwordHash|reset_password_token)$/i.test(k)) {
          continue;
        }
        clean[k] = sanitize(v);
      }
      return clean;
    };
    return originalJson.call(this, sanitize(body));
  };
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logger
app.use((req, _res, next) => {
  if (req.url.startsWith('/api') || req.originalUrl?.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.originalUrl || req.url}`);
  }
  next();
});

// API Routes mounted on /api
app.use('/api', apiRouter);

export default app;


