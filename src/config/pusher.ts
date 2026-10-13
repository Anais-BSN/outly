/**
 * Configuration centralisée et immuable de secours pour Pusher Channels.
 * Garantit que la clé et le cluster ne soient jamais undefined même lors de la compilation mobile Capacitor.
 */
export const PUSHER_FALLBACK_CONFIG = {
  key: 'ffb22ce4e830df75afc1',
  cluster: 'eu',
} as const;

export const getPusherKey = (): string => {
  try {
    const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUSHER_KEY) || '';
    if (envKey && typeof envKey === 'string' && !envKey.includes('ton_key')) {
      return envKey;
    }
  } catch (_) {}
  return PUSHER_FALLBACK_CONFIG.key;
};

export const getPusherCluster = (): string => {
  try {
    const envCluster = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUSHER_CLUSTER) || '';
    if (envCluster && typeof envCluster === 'string') {
      return envCluster;
    }
  } catch (_) {}
  return PUSHER_FALLBACK_CONFIG.cluster;
};
