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
   * Envoi d'un e-mail d'invitation à un groupe ou en ami
   */
  async sendInvitation({ toEmail, senderName, groupName, inviteLink }: SendInviteEmailParams) {
    const subject = groupName
      ? `Invitation : Rejoignez le groupe "${groupName}" sur Outly`
      : `Demande d'ami de ${senderName} sur Outly`;

    const appBaseUrl = process.env.APP_URL || 'http://localhost:3000';
    const finalInviteLink = inviteLink || appBaseUrl;

    const htmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif, Arial; background-color: #FFF9EB; color: #27272A; padding: 24px; border-radius: 16px; max-width: 550px; margin: auto; border: 1px solid #C7B7A3;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #6D2932; font-family: Georgia, serif; font-size: 28px; margin: 0;">Outly</h1>
        </div>
        <div style="background-color: #E8D8C4; padding: 20px; border-radius: 12px; border: 1px solid #C7B7A3;">
          <h2 style="color: #6D2932; font-size: 18px; margin-top: 0;">${senderName} vous invite !</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #27272A;">
            ${groupName ? `Vous avez été invité(e) à rejoindre le groupe d'escapades <strong>${groupName}</strong>.` : `${senderName} souhaite se connecter avec vous sur Outly.`}
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${finalInviteLink}" style="display: inline-block; background-color: #6D2932; color: #FFF9EB; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: bold; font-size: 14px;">
              ${groupName ? 'Rejoindre le groupe' : 'Accepter l\'invitation'}
            </a>
          </div>
        </div>
        <p style="text-align: center; font-size: 11px; color: #71717A; margin-top: 16px;">
          Cet e-mail a été envoyé automatiquement par Outly.
        </p>
      </div>
    `;

    if (!resend) {
      console.log(`[Resend SIMULATION] Email d'invitation simulé envoyé à ${toEmail} pour "${groupName || 'Amis'}" de la part de ${senderName}`);
      return { success: true, simulated: true, id: `sim-${Date.now()}` };
    }

    try {
      const data = await resend.emails.send({
        from: 'Outly <notifications@resend.dev>',
        to: toEmail,
        subject,
        html: htmlContent,
      });
      return { success: true, data };
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi via Resend:', error);
      return { success: false, error: error.message };
    }
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

    const subject = `Rappel Outly : "${eventTitle}" a lieu demain !`;

    const htmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif, Arial; background-color: #FFF9EB; color: #27272A; padding: 24px; border-radius: 16px; max-width: 550px; margin: auto; border: 1px solid #C7B7A3;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #6D2932; font-family: Georgia, serif; font-size: 28px; margin: 0;">Outly</h1>
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
        from: 'Outly <notifications@resend.dev>',
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
