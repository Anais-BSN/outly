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

export interface SendReminderEmailParams {
  toEmail: string;
  eventTitle: string;
  startDateTime: string;
  location?: string;
  gpsUrl?: string;
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

    const baseUrl = process.env.APP_URL || 'https://outlys.fr';
    const invitationUrl = inviteLink || (token ? `${baseUrl.replace(/\/$/, '')}/invite/${token}` : baseUrl.replace(/\/$/, ''));

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
          <div style="text-align: center; margin: 24px 0;">
            <a href="${invitationUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-family: sans-serif; text-align: center;">
              Rejoindre sur Outlys
            </a>
            <p style="margin-top: 20px; font-size: 13px; color: #6b7280; text-align: center;">
              Si le bouton ne s'ouvre pas, copiez et collez ce lien dans votre navigateur :<br/>
              <a href="${invitationUrl}" style="color: #2563eb; word-break: break-all;">${invitationUrl}</a>
            </p>
          </div>
        </div>
        <p style="text-align: center; font-size: 11px; color: #71717A; margin-top: 16px;">
          Cet e-mail a été envoyé automatiquement par Outlys.
        </p>
      </div>
    `;

    if (!resend) {
      console.log(`[Resend SIMULATION] Email d'invitation simulé envoyé individuellement à ${toEmail} pour "${groupName || 'Amis'}" de la part de ${senderName} (Lien : ${invitationUrl})`);
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
            <div style="text-align: center; margin: 20px 0;">
              <a href="${gpsUrl}" style="display: inline-block; background-color: #6D2932; color: #FFF9EB; text-decoration: none; padding: 10px 20px; border-radius: 9999px; font-weight: bold; font-size: 13px;">
                Voir l'itinéraire GPS
              </a>
            </div>
          ` : ''}
        </div>
        <p style="text-align: center; font-size: 11px; color: #71717A; margin-top: 16px;">
          N'oubliez pas vos équipements et prévenez le groupe en cas d'imprévu.
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
};
