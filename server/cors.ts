import { Request, Response, NextFunction } from 'express';

/**
 * Valide si l'origine d'une requête est autorisée à accéder aux API du serveur.
 * - Requêtes same-origin / internes (sans en-tête Origin) autorisées
 * - Domaines officiels de production (outlys.fr, www.outlys.fr)
 * - Applications mobiles natives Capacitor / Ionic (capacitor://localhost, http://localhost, https://localhost, null)
 * - Variables d'environnement de configuration (APP_URL, CLIENT_URL, FRONTEND_URL, CORS_ORIGIN, VITE_API_URL)
 * - Environnements de développement locaux (localhost, 127.0.0.1 sur tout port)
 * - Prévisualisations Vercel (*.vercel.app)
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;

  const normalized = origin.trim().toLowerCase().replace(/\/$/, '');

  // 1. Applications mobiles natives Capacitor / Ionic / WebViews
  const mobileOrigins = [
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'https://localhost',
    'capacitor://',
    'null',
  ];
  if (mobileOrigins.includes(normalized) || /^capacitor:\/\/[a-zA-Z0-9_.-]+$/.test(normalized)) {
    return true;
  }

  // 2. Domaines officiels de production
  const officialDomains = [
    'https://outlys.fr',
    'https://www.outlys.fr',
    'http://outlys.fr',
    'http://www.outlys.fr',
  ];
  if (officialDomains.includes(normalized)) return true;

  // 3. Variables d'environnement configurées
  const envUrls = [
    process.env.APP_URL,
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    process.env.VITE_API_URL,
  ].filter(Boolean) as string[];

  for (const envUrl of envUrls) {
    const cleanEnv = envUrl.trim().toLowerCase().replace(/\/$/, '');
    if (normalized === cleanEnv) return true;
  }

  // 4. Environnements de développement locaux
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized);
  if (isLocalhost) return true;

  // 5. Déploiements preview Vercel légitimes (*.vercel.app)
  const isVercelPreview = /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(normalized);
  if (isVercelPreview) return true;

  return false;
}

/**
 * Middleware de sécurité CORS pour Express restreignant les origines aux domaines autorisés
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin) {
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Custom-Header');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
    } else {
      if (req.method === 'OPTIONS') {
        return res.status(403).json({ error: 'Origine non autorisée par la politique CORS' });
      }
    }
  } else {
    // Requêtes directes ou natives sans header Origin explicite
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}
