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
 * Construit l'adresse de base de l'application
 */
export function getCleanAppUrl(): string {
  const rawUrl = (process.env.APP_URL || 'https://outlys.fr').trim();
  const withoutTrailingSlashes = rawUrl.replace(/\/+$/, '');
  if (withoutTrailingSlashes.startsWith('http://outlys.fr')) {
    return withoutTrailingSlashes.replace('http://', 'https://');
  }
  if (!withoutTrailingSlashes.startsWith('http://') && !withoutTrailingSlashes.startsWith('https://')) {
    return `https://${withoutTrailingSlashes}`;
  }
  return withoutTrailingSlashes;
}

/**
 * Construit une URL absolue propre pour les e-mails
 */
export function buildAbsoluteEmailUrl(pathOrUrl?: string): string {
  const baseUrl = getCleanAppUrl();
  if (!pathOrUrl || pathOrUrl.trim() === '') {
    return baseUrl;
  }
  const trimmed = pathOrUrl.trim();
  if (trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('http://outlys.fr')) {
    return trimmed.replace('http://', 'https://');
  }
  if (trimmed.startsWith('http://')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${cleanPath}`;
}

export const emailService = {
  /**
   * Envoi d'un e-mail d'invitation individuel à un groupe ou en ami
   * Confidentialité : chaque e-mail est envoyé de façon indépendante avec un seul destinataire dans To:
   */
  async sendInvitation({ toEmail, senderName, groupName, inviteLink, token }: SendInviteEmailParams) {
    const subject = groupName
      ? `Invitation : Rejoignez le groupe "${groupName}" sur Outlys`
      : `Demande d'ami de ${senderName} sur Outlys`;

    const finalInviteLink = inviteLink
      ? buildAbsoluteEmailUrl(inviteLink)
      : (token ? buildAbsoluteEmailUrl(`/invite/${token}`) : getCleanAppUrl());

    const htmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif, Arial; background-color: #FFF9EB; color: #27272A; padding: 24px; border-radius: 16px; max-width: 550px; margin: auto; border: 1px solid #C7B7A3;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #6D2932; font-family: Georgia, serif; font-size: 28px; margin: 0;">Outlys</h1>
        </div>
        <div style="background-color: #E8D8C4; padding: 20px; border-radius: 12px; border: 1px solid #C7B7A3;">
          <h2 style="color: #6D2932; font-size: 18px; margin-top: 0;">${senderName} vous invite !</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #27272A;">
            ${groupName ? `Vous avez été invité(e) à rejoindre le groupe d'escapades <strong>${groupName}</strong>.` : `${senderName} souhaite se connecter avec vous sur Outlys.`}
          </p>
          <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 24px auto; border-collapse: separate;">
            <tr>
              <td align="center" bgcolor="#6D2932" style="background-color: #6D2932; border-radius: 9999px;">
                <a href="${finalInviteLink}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: 'Plus Jakarta Sans', sans-serif, Arial; font-size: 14px; font-weight: bold; color: #FFF9EB; text-decoration: none; border-radius: 9999px;">
                  ${groupName ? 'Rejoindre le groupe' : 'Accepter l\'invitation'}
                </a>
              </td>
            </tr>
          </table>
        </div>
        <p style="text-align: center; font-size: 11px; color: #71717A; margin-top: 16px;">
          Cet e-mail a été envoyé automatiquement par Outlys.
        </p>
      </div>
    `;

    if (!resend) {
      console.log(`[Resend SIMULATION] Email d'invitation simulé envoyé individuellement à ${toEmail} pour "${groupName || 'Amis'}" de la part de ${senderName} (Lien : ${finalInviteLink})`);
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
   * Garantit une stricte confidentialité (aucun autre destinataire dans l'en-tête To:)
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

    const htmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif, Arial; background-color: #FFF9EB; color: #27272A; padding: 24px; border-radius: 16px; max-width: 550px; margin: auto; border: 1px solid #C7B7A3;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #6D2932; font-family: Georgia, serif; font-size: 28px; margin: 0;">Outlys</h1>
          <p style="color: #6D2932; font-size: 14px; margin-top: 4px;">Rappel d'événement</p>
        </div>
        <div style="background-color: #E8D8C4; padding: 20px; border-radius: 12px; border: 1px solid #C7B7A3;">
          <h2 style="color: #6D2932; font-size: 18px; margin-top: 0;">C'est demain !</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #27272A;">
            Votre sortie <strong>"${eventTitle}"</strong> débute le <strong>${formattedDate}</strong>.
          </p>
          ${location ? `<p style="font-size: 13px; color: #27272A;"><strong>Lieu :</strong> ${location}</p>` : ''}
          ${gpsUrl ? `
            <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 20px auto; border-collapse: separate;">
              <tr>
                <td align="center" bgcolor="#6D2932" style="background-color: #6D2932; border-radius: 9999px;">
                  <a href="${gpsUrl}" target="_blank" style="display: inline-block; padding: 10px 22px; font-family: 'Plus Jakarta Sans', sans-serif, Arial; font-size: 13px; font-weight: bold; color: #FFF9EB; text-decoration: none; border-radius: 9999px;">
                    Voir l'itinéraire GPS
                  </a>
                </td>
              </tr>
            </table>
          ` : ''}
        </div>
        <p style="text-align: center; font-size: 11px; color: #71717A; margin-top: 16px;">
          Cet e-mail a été envoyé automatiquement par Outlys. N'oubliez pas vos équipements et prévenez le groupe en cas d'imprévu.
        </p>
      </div>
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
      <div style="font-family: 'Plus Jakarta Sans', sans-serif, Arial; background-color: #FFF9EB; color: #27272A; padding: 24px; border-radius: 16px; max-width: 550px; margin: auto; border: 1px solid #C7B7A3;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #6D2932; font-family: Georgia, serif; font-size: 28px; margin: 0;">Outlys</h1>
        </div>
        <div style="background-color: #E8D8C4; padding: 20px; border-radius: 12px; border: 1px solid #C7B7A3;">
          <h2 style="color: #6D2932; font-size: 18px; margin-top: 0;">Réinitialisation de votre mot de passe</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #27272A;">
            Bonjour${userName ? ` <strong>${userName}</strong>` : ''}, vous avez demandé la réinitialisation de votre mot de passe sur Outlys.
          </p>
          <p style="font-size: 14px; line-height: 1.5; color: #27272A;">
            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :
          </p>
          <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 24px auto; border-collapse: separate;">
            <tr>
              <td align="center" bgcolor="#6D2932" style="background-color: #6D2932; border-radius: 9999px;">
                <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: 'Plus Jakarta Sans', sans-serif, Arial; font-size: 14px; font-weight: bold; color: #FFF9EB; text-decoration: none; border-radius: 9999px;">
                  Réinitialiser mon mot de passe
                </a>
              </td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #71717A; margin-top: 16px;">
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Ce lien est valable pendant 1 heure.
          </p>
        </div>
        <p style="text-align: center; font-size: 11px; color: #71717A; margin-top: 16px;">
          Cet e-mail a été envoyé automatiquement par Outlys.
        </p>
      </div>
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
