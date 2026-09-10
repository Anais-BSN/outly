import { Resend } from 'resend';

// Initialisation du client avec la clé d'API
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envoie une invitation par e-mail pour rejoindre un groupe
 */
export async function sendGroupInviteEmail(to: string, groupName: string, inviterName: string) {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const data = await resend.emails.send({
      from: 'Outly <onboarding@resend.dev>', // En dev, utilise cette adresse par défaut
      to,
      subject: `${inviterName} t'invite à rejoindre "${groupName}" sur Outly`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FFF9EB; padding: 32px; color: #18181B; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #E8D8C4;">
          <h2 style="color: #5D0D18; margin-top: 0;">Rejoins l'aventure sur Outly !</h2>
          <p style="font-size: 15px; line-height: 1.5;">
            <strong>${inviterName}</strong> t'a invité à rejoindre le groupe <strong>${groupName}</strong> pour organiser vos prochaines sorties ensemble.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${appUrl}" style="display: inline-block; background-color: #5D0D18; color: #FFF9EB; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
              Rejoindre le groupe
            </a>
          </div>
          <p style="font-size: 12px; color: #666; text-align: center; margin-bottom: 0;">
            Planifie • Partage • Sors
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
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const data = await resend.emails.send({
      from: 'Outly <onboarding@resend.dev>',
      to,
      subject: `Rappel : ${eventTitle} a lieu demain !`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FFF9EB; padding: 32px; color: #18181B; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #E8D8C4;">
          <h2 style="color: #5D0D18; margin-top: 0;">Rappel de ta sortie</h2>
          <p style="font-size: 15px; line-height: 1.5;">
            L'événement <strong>${eventTitle}</strong> commence demain.
          </p>
          <ul style="font-size: 14px; line-height: 1.6; color: #333;">
            <li><strong>Horaire :</strong> ${eventDate}</li>
            <li><strong>Lieu :</strong> ${location}</li>
          </ul>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${appUrl}" style="display: inline-block; background-color: #5D0D18; color: #FFF9EB; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
              Voir les détails sur Outly
            </a>
          </div>
        </div>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Erreur lors de l'envoi du rappel via Resend :", error);
    return { success: false, error };
  }
}