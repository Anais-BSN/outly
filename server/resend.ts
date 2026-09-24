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
      <div style="font-family: Arial, sans-serif; color: #27272A; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <h2 style="color: #6D2932; margin-top: 0; font-size: 22px;">Outlys</h2>
        <p style="font-size: 15px;">Bonjour,</p>
        <p style="font-size: 15px;">
          ${groupName ? `<strong>${senderName}</strong> vous invite à rejoindre le groupe d'escapades <strong>${groupName}</strong> sur Outlys.` : `<strong>${senderName}</strong> vous invite à vous connecter sur Outlys.`}
        </p>
        <p style="margin: 24px 0; font-size: 16px;">
          👉 <a href="${finalInviteLink}" style="color: #1a73e8; text-decoration: underline; font-weight: bold;">${groupName ? 'Rejoindre le groupe' : 'Accepter l\'invitation'}</a>
        </p>
        <p style="font-size: 13px; color: #555555; margin-top: 20px; word-break: break-all;">
          Si le lien ci-dessus ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :<br/>
          <a href="${finalInviteLink}" style="color: #1a73e8; text-decoration: underline;">${finalInviteLink}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0 15px 0;" />
        <p style="font-size: 12px; color: #888888;">
          Cet e-mail automatique a été envoyé par Outlys.
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
      <div style="font-family: Arial, sans-serif; color: #27272A; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <h2 style="color: #6D2932; margin-top: 0; font-size: 22px;">Outlys - Rappel de sortie</h2>
        <p style="font-size: 15px;">Bonjour,</p>
        <p style="font-size: 15px;">
          Votre événement <strong>"${eventTitle}"</strong> débute le <strong>${formattedDate}</strong>.
        </p>
        ${location ? `<p style="font-size: 14px; color: #333333;"><strong>Lieu :</strong> ${location}</p>` : ''}
        ${gpsUrl ? `
          <p style="margin: 20px 0; font-size: 15px;">
            📍 <a href="${gpsUrl}" style="color: #1a73e8; text-decoration: underline; font-weight: bold;">Voir l'itinéraire GPS</a>
          </p>
          <p style="font-size: 13px; color: #555555; word-break: break-all;">
            Lien direct : <a href="${gpsUrl}" style="color: #1a73e8; text-decoration: underline;">${gpsUrl}</a>
          </p>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0 15px 0;" />
        <p style="font-size: 12px; color: #888888;">
          Cet e-mail automatique a été envoyé par Outlys.
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
      <div style="font-family: Arial, sans-serif; color: #27272A; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <h2 style="color: #6D2932; margin-top: 0; font-size: 22px;">Outlys</h2>
        <p style="font-size: 15px;">
          Bonjour${userName ? ` <strong>${userName}</strong>` : ''},
        </p>
        <p style="font-size: 15px;">
          Vous avez demandé la réinitialisation de votre mot de passe sur Outlys.
        </p>
        <p style="margin: 24px 0; font-size: 16px;">
          🔒 <a href="${resetUrl}" style="color: #1a73e8; text-decoration: underline; font-weight: bold;">Réinitialiser mon mot de passe</a>
        </p>
        <p style="font-size: 13px; color: #555555; margin-top: 20px; word-break: break-all;">
          Si le lien ci-dessus ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :<br/>
          <a href="${resetUrl}" style="color: #1a73e8; text-decoration: underline;">${resetUrl}</a>
        </p>
        <p style="font-size: 13px; color: #666666; margin-top: 15px;">
          Ce lien est valable pendant 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0 15px 0;" />
        <p style="font-size: 12px; color: #888888;">
          Cet e-mail automatique a été envoyé par Outlys.
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
