import { Resend } from 'resend';

// Initialisation du client avec la clé d'API
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Construit une adresse de base propre et sécurisée (HTTPS par défaut avec repli https://outlys.fr)
 */
function getCleanAppUrl(): string {
  const rawUrl = (process.env.APP_URL || 'https://outlys.fr').trim();
  const withoutTrailingSlashes = rawUrl.replace(/\/+$/, '');
  if (!withoutTrailingSlashes.startsWith('http://') && !withoutTrailingSlashes.startsWith('https://')) {
    return `https://${withoutTrailingSlashes}`;
  }
  return withoutTrailingSlashes;
}

/**
 * Construit une URL absolue propre évitant tout double slash.
 */
function buildAbsoluteUrl(pathOrUrl?: string): string {
  const baseUrl = getCleanAppUrl();
  if (!pathOrUrl || pathOrUrl.trim() === '') {
    return baseUrl;
  }
  const trimmed = pathOrUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Envoie une invitation par e-mail pour rejoindre un groupe
 */
export async function sendGroupInviteEmail(to: string, groupName: string, inviterName: string, token?: string) {
  try {
    const invitationUrl = token ? buildAbsoluteUrl(`/invite/${token}`) : getCleanAppUrl();
    const data = await resend.emails.send({
      from: 'Outlys <invitation@outlys.fr>',
      to,
      subject: `${inviterName} t'invite à rejoindre "${groupName}" sur Outlys`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF9EB; padding: 32px; color: #18181B; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #E8D8C4;">
          <h2 style="color: #5D0D18; margin-top: 0;">Rejoins l'aventure sur Outlys !</h2>
          <p style="font-size: 15px; line-height: 1.5; color: #18181B;">
            <strong>${inviterName}</strong> t'a invité à rejoindre le groupe <strong>${groupName}</strong> pour organiser vos prochaines sorties ensemble.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 25px auto; border-collapse: collapse;">
              <tr>
                <td align="center" bgcolor="#5D0D18" style="border-radius: 50px; background-color: #5D0D18;">
                  <a href="${invitationUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 50px; background-color: #5D0D18; text-align: center;">
                    Rejoindre sur Outlys
                  </a>
                </td>
              </tr>
            </table>
          </div>
          <p style="font-size: 12px; color: #71717A; text-align: center; margin-bottom: 0; margin-top: 24px;">
            Cet e-mail a été envoyé automatiquement par Outlys.
          </p>
        </div>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'invitation via Resend :", error);
    return { success: false, error };
  }
}

/**
 * Envoie un rappel automatique 24 h avant une sortie
 */
export async function sendEventReminderEmail(to: string, eventTitle: string, eventDate: string, location: string) {
  try {
    const appUrl = getCleanAppUrl();
    const data = await resend.emails.send({
      from: 'Outlys <invitation@outlys.fr>',
      to,
      subject: `Rappel : ${eventTitle} a lieu demain !`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF9EB; padding: 32px; color: #18181B; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #E8D8C4;">
          <h2 style="color: #5D0D18; margin-top: 0;">Rappel de ta sortie</h2>
          <p style="font-size: 15px; line-height: 1.5; color: #18181B;">
            L'événement <strong>${eventTitle}</strong> commence demain.
          </p>
          <ul style="font-size: 14px; line-height: 1.6; color: #333333;">
            <li><strong>Horaire :</strong> ${eventDate}</li>
            <li><strong>Lieu :</strong> ${location}</li>
          </ul>
          <div style="text-align: center; margin: 28px 0;">
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto; border-collapse: collapse;">
              <tr>
                <td align="center" bgcolor="#5D0D18" style="border-radius: 50px; background-color: #5D0D18;">
                  <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 50px; background-color: #5D0D18; text-align: center;">
                    Voir les détails sur Outlys
                  </a>
                </td>
              </tr>
            </table>
          </div>
          <p style="font-size: 12px; color: #71717A; text-align: center; margin-bottom: 0; margin-top: 24px;">
            Cet e-mail a été envoyé automatiquement par Outlys.
          </p>
        </div>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Erreur lors de l'envoi du rappel via Resend :", error);
    return { success: false, error };
  }
}