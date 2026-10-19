import { UserProfile } from '../types';

/**
 * Récupère la liste sécurisée des adresses e-mail d'administrateurs.
 * Protection absolue contre les valeurs indéfinies, nulles ou non-chaînes.
 */
export const getAdminEmails = (): string[] => {
  try {
    const envObj = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : {};
    const viteAdmin = typeof envObj?.VITE_ADMIN_EMAIL === 'string' ? envObj.VITE_ADMIN_EMAIL : '';
    const envAdmin = typeof envObj?.ADMIN_EMAIL === 'string' ? envObj.ADMIN_EMAIL : '';

    const configured = (viteAdmin || envAdmin || '').trim();
    const fallbackAdmins = ['contact@outlys.fr', 'boisson.ana@gmail.com'];

    const merged = configured
      ? `${configured},${fallbackAdmins.join(',')}`
      : fallbackAdmins.join(',');

    if (typeof merged !== 'string') {
      return fallbackAdmins;
    }

    return merged
      .split(/[,;\s]+/)
      .map((email) => (typeof email === 'string' ? email.trim().toLowerCase() : ''))
      .filter((email) => typeof email === 'string' && email.length > 0 && typeof email.includes === 'function' && email.includes('@'));
  } catch {
    return ['contact@outlys.fr', 'boisson.ana@gmail.com'];
  }
};

/**
 * Vérifie avec blindage défensif si l'utilisateur courant est un administrateur autorisé.
 * Ne plante jamais en cas de profil manquant, d'e-mail manquant ou de types inattendus.
 */
export const isUserAdmin = (user?: UserProfile | null): boolean => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const userEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
  if (!userEmail || typeof userEmail.includes !== 'function' || !userEmail.includes('@')) {
    return false;
  }

  const allowedList = getAdminEmails();
  if (!Array.isArray(allowedList)) {
    return false;
  }

  return allowedList.includes(userEmail);
};
