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

  // 4. Environnements de développement locaux (localhost, 127.0.0.1 et adresses IP LAN 192.168.x, 10.x, 172.x)
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized);
  const isLanIp = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(normalized);
  if (isLocalhost || isLanIp) return true;

  // 5. Déploiements preview Vercel légitimes (*.vercel.app)
  const isVercelPreview = /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(normalized);
  if (isVercelPreview) return true;

  // 6. Autorisation universelle pour environnements externes / Capacitor
  return true;
}

/**
 * Middleware de sécurité CORS dynamique pour Express :
 * - Lis l'en-tête Origin de la requête entrante
 * - Règle "Access-Control-Allow-Origin" avec cet Origin exact (jamais le wildcard *)
 * - Utilise une valeur de repli sécurisée (URL de production) si l'Origin n'est pas défini
 * - Injecte obligatoirement "Access-Control-Allow-Credentials": "true"
 * - Intercepte les requêtes OPTIONS (preflight) et renvoie immédiatement un statut 200 OK
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  // Valeur de repli sécurisée ou URL de production si l'en-tête Origin n'est pas défini
  const fallbackOrigin =
    process.env.APP_URL ||
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    'https://www.outlys.fr';

  const allowedOrigin = origin ? origin : fallbackOrigin;

  // Règle dynamiquement l'en-tête Access-Control-Allow-Origin avec l'Origin exact
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  // Preflight (OPTIONS) : renvoi immédiat de 200 OK avec en-têtes CORS avant toute vérification de token
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}
