import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.RESEND_API_KEY;
const isConfigured = apiKey && apiKey.startsWith('re_') && !apiKey.includes('123456789') && !apiKey.includes('your_resend');

export const resend = isConfigured ? new Resend(apiKey) : null;

export interface SendInviteEmailParams {
  toEmail: string;
  senderName: string;
  groupName?: string;
  inviteLink?: string;
  token?: string;
}

export interface SendResetPasswordParams {
  toEmail: string;
  userName?: string;
  resetLink?: string;
  token?: string;
}

export interface SendReminderEmailParams {
  toEmail: string;
  eventTitle: string;
  startDateTime: string;
  location?: string;
  gpsUrl?: string;
}

/**
 * Nettoie une chaîne d'URL pour supprimer toute syntaxe Markdown, doubles protocoles ou domaines temporaires
 */
export function sanitizeEmailUrl(input?: string): string {
  if (!input) return 'https://outlys.fr';
  let str = String(input).trim();

  // Supprime la syntaxe Markdown [texte](url) -> url
  const mdLinkMatch = str.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
  if (mdLinkMatch && mdLinkMatch[1]) {
    str = mdLinkMatch[1].trim();
  }

  // Supprimer les crochets, parenthèses, guillemets résiduels
  str = str.replace(/[\[\]\(\)\"\'\<\>]/g, '').trim();

  // Remplacement de tout domaine render technique par le domaine officiel de production outlys.fr
  str = str.replace(/https?:\/\/[a-zA-Z0-9-]+\.onrender\.com/gi, 'https://outlys.fr')
           .replace(/https?:\/\/[a-zA-Z0-9-]+\.render\.com/gi, 'https://outlys.fr');

  // Supprime les doubles préfixes https://https:// ou http://https://
  while (/^(https?:\/\/)+https?:\/\//i.test(str)) {
    str = str.replace(/^(https?:\/\/)+/i, '');
  }

  while (str.match(/^(https?:\/\/){2,}/i)) {
    str = str.replace(/^(https?:\/\/)+/i, 'https://');
  }

  // Si l'URL commence par http://outlys.fr, on force https://outlys.fr
  if (str.startsWith('http://outlys.fr')) {
    str = str.replace('http://outlys.fr', 'https://outlys.fr');
  }

  // Si l'URL commence par outlys.fr sans protocole
  if (str.startsWith('outlys.fr')) {
    str = `https://${str}`;
  }

  return str;
}

/**
 * Construit l'adresse de base propre de l'application (strictement outlys.fr en production)
 */
export function getCleanAppUrl(): string {
  const envUrl = process.env.APP_URL ? process.env.APP_URL.trim() : '';
  let cleanUrl = sanitizeEmailUrl(envUrl || 'https://outlys.fr');
  
  if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
    return cleanUrl.replace(/\/+$/, '');
  }

  // En production, toujours utiliser strictement https://outlys.fr
  if (!cleanUrl || cleanUrl.includes('onrender') || !cleanUrl.startsWith('http')) {
    cleanUrl = 'https://outlys.fr';
  }

  return cleanUrl.replace(/\/+$/, '');
}

/**
 * Construit une URL absolue propre pour les e-mails (sans Markdown, strictement HTTPS et domaine officiel outlys.fr)
 */
export function buildAbsoluteEmailUrl(pathOrUrl?: string): string {
  const baseUrl = getCleanAppUrl();
  if (!pathOrUrl || pathOrUrl.trim() === '') {
    return baseUrl;
  }

  let cleaned = sanitizeEmailUrl(pathOrUrl);

  // Si c'est déjà une URL complète avec protocole
  if (cleaned.startsWith('https://') || cleaned.startsWith('http://localhost') || cleaned.startsWith('http://127.0.0.1')) {
    return cleaned;
  }

  // Si c'est une URL commençant par outlys.fr sans protocole
  if (cleaned.startsWith('outlys.fr')) {
    return `https://${cleaned}`;
  }

  const cleanPath = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return `${baseUrl}${cleanPath}`;
}

export const emailService = {
  /**
   * Envoi d'un e-mail d'invitation individuel à un groupe ou en ami
   * Charte graphique officielle Outlys & Déblocage total Gmail
   */
  async sendInvitation({ toEmail, senderName, groupName, inviteLink, token }: SendInviteEmailParams) {
    const subject = groupName
      ? `Invitation : Rejoignez le groupe "${groupName}" sur Outlys`
      : `Demande d'ami de ${senderName} sur Outlys`;

    const finalInviteLink = inviteLink
      ? buildAbsoluteEmailUrl(inviteLink)
      : (token ? buildAbsoluteEmailUrl(`/invite/${token}`) : getCleanAppUrl());

    const invitationHeader = groupName
      ? `${senderName} vous invite !`
      : `${senderName} souhaite devenir ami(e) !`;

    const explanationText = groupName
      ? `Rejoignez le groupe d'escapades <strong>${groupName}</strong> sur <strong>Outlys</strong> pour planifier vos sorties, partager vos frais et échanger vos photos en toute simplicité.`
      : `<strong>${senderName}</strong> vous invite à vous connecter sur <strong>Outlys</strong> pour organiser vos prochaines escapades ensemble.`;

    const buttonLabel = groupName ? 'Rejoindre le groupe' : 'Accepter l\'invitation';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF8F5; padding: 40px 16px;">
          <tr>
            <td align="center">
              <!-- Carte centrale beige clair avec coins arrondis et ombre douce -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #FDFBF7; border: 1px solid #EBE3DA; border-radius: 24px; box-shadow: 0 4px 20px rgba(93, 13, 24, 0.05); overflow: hidden; padding: 36px 28px;">
                <!-- Titre Outlys en bordeaux centré en haut -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 30px; font-weight: bold; color: #5D0D18; letter-spacing: 0.5px;">Outlys</h1>
                  </td>
                </tr>

                <!-- En-tête d'invitation personnalisé en gras bordeaux -->
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: bold; color: #5D0D18;">${invitationHeader}</h2>
                  </td>
                </tr>

                <!-- Texte explicatif sobre et aéré -->
                <tr>
                  <td align="center" style="padding-bottom: 28px; font-size: 15px; line-height: 1.6; color: #27272A;">
                    <p style="margin: 0;">${explanationText}</p>
                  </td>
                </tr>

                <!-- Bouton d'action pilule bordeaux foncé standard HTML table cell -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: separate;">
                      <tr>
                        <td align="center" style="background-color: #5D0D18; border-radius: 50px; padding: 0;">
                          <a href="${finalInviteLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 34px; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 50px; background-color: #5D0D18; letter-spacing: 0.3px;">
                            ${buttonLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Lien de secours complet en texte brut cliquable -->
                <tr>
                  <td align="center" style="padding-bottom: 28px; font-size: 12px; line-height: 1.5; color: #71717A; word-break: break-all;">
                    Si le bouton ne s'ouvre pas, cliquez sur ce lien ou copiez-le dans votre navigateur :<br/>
                    <a href="${finalInviteLink}" target="_blank" rel="noopener noreferrer" style="color: #5D0D18; text-decoration: underline; font-weight: 500;">${finalInviteLink}</a>
                  </td>
                </tr>

                <!-- Pied de page discret -->
                <tr>
                  <td align="center" style="border-top: 1px solid #EBE3DA; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #8C827A;">Cet e-mail a été envoyé automatiquement par Outlys.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!resend) {
      console.log(`[Resend SIMULATION] Email d'invitation envoyé individuellement à ${toEmail} pour "${groupName || 'Amis'}" de la part de ${senderName} (Lien : ${finalInviteLink})`);
      return { success: true, simulated: true, id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, toEmail };
    }

    try {
      const data = await resend.emails.send({
        from: 'Outlys <invitation@outlys.fr>',
        to: toEmail,
        subject,
        html: htmlContent,
      });
      return { success: true, data, toEmail };
    } catch (error: any) {
      console.error(`Erreur lors de l'envoi via Resend à ${toEmail}:`, error);
      return { success: false, error: error.message, toEmail };
    }
  },

  /**
   * Envoi par lot d'invitations : chaque destinataire reçoit un e-mail individuel
   * Confidentialité : strict envoi unitaire par destinataire
   */
  async sendBatchInvitations(invites: SendInviteEmailParams[]) {
    if (!invites || invites.length === 0) {
      return { success: true, count: 0, total: 0, results: [] };
    }

    console.log(`[Resend Batch] Envoi individuel de ${invites.length} invitations...`);

    const results = await Promise.all(
      invites.map((invite) => this.sendInvitation(invite))
    );

    const successCount = results.filter((r) => r.success).length;

    return {
      success: successCount > 0 || invites.length === 0,
      count: successCount,
      total: invites.length,
      results,
    };
  },

  /**
   * Envoi d'un rappel 24 h avant un événement
   */
  async sendEventReminder({ toEmail, eventTitle, startDateTime, location, gpsUrl }: SendReminderEmailParams) {
    const formattedDate = new Date(startDateTime).toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `Rappel Outlys : "${eventTitle}" a lieu demain !`;
    const appUrl = getCleanAppUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF8F5; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #FDFBF7; border: 1px solid #EBE3DA; border-radius: 24px; box-shadow: 0 4px 20px rgba(93, 13, 24, 0.05); overflow: hidden; padding: 36px 28px;">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 30px; font-weight: bold; color: #5D0D18;">Outlys</h1>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: bold; color: #5D0D18;">Rappel de sortie</h2>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 24px; font-size: 15px; line-height: 1.6; color: #27272A;">
                    <p style="margin: 0 0 10px 0;">Votre sortie <strong>« ${eventTitle} »</strong> a lieu demain !</p>
                    <p style="margin: 0; font-size: 14px; color: #555555;">📅 <strong>${formattedDate}</strong></p>
                    ${location ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #555555;">📍 <strong>Lieu :</strong> ${location}</p>` : ''}
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: separate;">
                      <tr>
                        <td align="center" style="background-color: #5D0D18; border-radius: 50px; padding: 0;">
                          <a href="${gpsUrl || appUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 34px; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 50px; background-color: #5D0D18;">
                            ${gpsUrl ? 'Voir l\'itinéraire GPS' : 'Ouvrir Outlys'}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="border-top: 1px solid #EBE3DA; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #8C827A;">Cet e-mail a été envoyé automatiquement par Outlys.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!resend) {
      console.log(`[Resend SIMULATION] Rappel d'événement envoyé à ${toEmail} pour "${eventTitle}" prévu le ${formattedDate}`);
      return { success: true, simulated: true, id: `sim-${Date.now()}` };
    }

    try {
      const data = await resend.emails.send({
        from: 'Outlys <invitation@outlys.fr>',
        to: toEmail,
        subject,
        html: htmlContent,
      });
      return { success: true, data };
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du rappel Resend:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Envoi d'un e-mail de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail({ toEmail, userName, resetLink, token }: SendResetPasswordParams) {
    const resetUrl = resetLink
      ? buildAbsoluteEmailUrl(resetLink)
      : (token ? buildAbsoluteEmailUrl(`/reset-password?token=${token}`) : buildAbsoluteEmailUrl('/reset-password'));
    const subject = 'Réinitialisation de votre mot de passe - Outlys';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF8F5; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #FDFBF7; border: 1px solid #EBE3DA; border-radius: 24px; box-shadow: 0 4px 20px rgba(93, 13, 24, 0.05); overflow: hidden; padding: 36px 28px;">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 30px; font-weight: bold; color: #5D0D18;">Outlys</h1>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: bold; color: #5D0D18;">Réinitialisation de mot de passe</h2>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 28px; font-size: 15px; line-height: 1.6; color: #27272A;">
                    <p style="margin: 0;">Bonjour${userName ? ` <strong>${userName}</strong>` : ''}, vous avez demandé la réinitialisation de votre mot de passe Outlys. Cliquez sur le bouton ci-dessous pour en définir un nouveau.</p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: separate;">
                      <tr>
                        <td align="center" style="background-color: #5D0D18; border-radius: 50px; padding: 0;">
                          <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 34px; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 50px; background-color: #5D0D18;">
                            Réinitialiser mon mot de passe
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 28px; font-size: 12px; line-height: 1.5; color: #71717A; word-break: break-all;">
                    Si le bouton ne s'ouvre pas, copiez-collez ce lien direct :<br/>
                    <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="color: #5D0D18; text-decoration: underline;">${resetUrl}</a>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="border-top: 1px solid #EBE3DA; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #8C827A;">Ce lien est valable pendant 1 heure. Cet e-mail a été envoyé automatiquement par Outlys.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!resend) {
      console.log(`[Resend SIMULATION] Email de réinitialisation de mot de passe envoyé à ${toEmail} (Lien : ${resetUrl})`);
      return { success: true, simulated: true, id: `sim-${Date.now()}` };
    }

    try {
      const data = await resend.emails.send({
        from: 'Outlys <invitation@outlys.fr>',
        to: toEmail,
        subject,
        html: htmlContent,
      });
      return { success: true, data };
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de la réinitialisation de mot de passe:', error);
      return { success: false, error: error.message };
    }
  },
};
