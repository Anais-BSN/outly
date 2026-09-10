import express from 'express';
import dotenv from 'dotenv';
import { apiRouter } from './api';

dotenv.config();

export const app = express();

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
