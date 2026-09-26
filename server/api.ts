import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from './db.ts';
import { emailService, getCleanAppUrl, buildAbsoluteEmailUrl } from './resend.ts';
import { realtimeBroadcaster } from './events.ts';

export const apiRouter = Router();

// Gestionnaire de flux d'événements temps réel (Server-Sent Events)
const handleSseConnection = (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const userId = req.query.userId as string | undefined;
  const groupId = req.query.groupId as string | undefined;

  realtimeBroadcaster.addSubscriber(subId, res, userId, groupId);

  // Événement initial de connexion établie
  res.write(`data: ${JSON.stringify({ type: 'connected', subscriberId: subId, timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    realtimeBroadcaster.removeSubscriber(subId);
  });
};

apiRouter.get('/events/stream', handleSseConnection);
apiRouter.get('/sse', handleSseConnection);

// Auto-migrations: ajouter les colonnes et tables requises si nécessaire
(async () => {
  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;`);
    await query(`ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS end_date_value TEXT;`);
    await query(`ALTER TABLE logistics_tasks ADD COLUMN IF NOT EXISTS event_id VARCHAR(50) REFERENCES events(id) ON DELETE CASCADE;`);
    await query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id VARCHAR(50) PRIMARY KEY,
        token VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
        inviter_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) DEFAULT 'group',
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS debt_settlements (
        id VARCHAR(100) PRIMARY KEY,
        group_id VARCHAR(50),
        from_user_id VARCHAR(50),
        to_user_id VARCHAR(50),
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'settled',
        settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    // Assurer la rétrocompatibilité des colonnes et supprimer les contraintes rigides sur utilisateurs virtuels
    await query(`ALTER TABLE debt_settlements DROP CONSTRAINT IF EXISTS debt_settlements_from_user_id_fkey;`);
    await query(`ALTER TABLE debt_settlements DROP CONSTRAINT IF EXISTS debt_settlements_to_user_id_fkey;`);
    await query(`ALTER TABLE debt_settlements DROP CONSTRAINT IF EXISTS debt_settlements_group_id_fkey;`);
  } catch (e) {
    console.error('Migration error (can be ignored if table locked):', e);
  }
})();

// ==========================================
// 1. AUTHENTIFICATION & COMPTE
// ==========================================

// Liste de tous les utilisateurs pour le changement rapide de compte
apiRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"
       FROM users
       ORDER BY first_name ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error in GET /users:', err);
    res.status(500).json({ error: err.message });
  }
});

// Vérification en direct de la disponibilité d'un pseudo (@handle)
apiRouter.get('/auth/check-handle', async (req: Request, res: Response) => {
  try {
    const handle = (req.query.handle as string) || '';
    if (!handle.trim()) {
      return res.json({ available: true });
    }
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const existing = await query(`SELECT id FROM users WHERE handle ILIKE $1`, [cleanHandle]);
    res.json({ available: existing.rows.length === 0 });
  } catch (err: any) {
    console.error('Error in GET /auth/check-handle:', err);
    res.status(500).json({ error: err.message });
  }
});

// Inscription
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName = '', email, handle, password, avatar } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({ error: 'Prénom et e-mail sont obligatoires' });
    }

    if (!handle || !handle.trim()) {
      return res.status(400).json({ error: 'Le pseudo est obligatoire' });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 4 caractères' });
    }

    const cleanHandle = handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`;

    // Vérifier si le pseudo est déjà pris
    const handleExists = await query(`SELECT id FROM users WHERE handle ILIKE $1`, [cleanHandle]);
    if (handleExists.rows.length > 0) {
      return res.status(400).json({ error: 'Ce pseudo est déjà utilisé, veuillez en choisir un autre.' });
    }

    // Vérifier si l'e-mail est déjà utilisé
    const emailExists = await query(`SELECT id FROM users WHERE email ILIKE $1`, [email.trim()]);
    if (emailExists.rows.length > 0) {
      return res.status(400).json({ error: 'Un compte avec cet e-mail existe déjà' });
    }

    const userId = `user-${Date.now()}`;
    const userAvatar =
      avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const insertRes = await query(
      `INSERT INTO users (id, first_name, last_name, email, handle, avatar, shares, theme_preference, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 'light', $7)
       RETURNING id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"`,
      [userId, firstName, lastName, email, cleanHandle, userAvatar, password]
    );

    // Nouveau compte vierge : 0 groupe, 0 ami, 0 sortie, 0 notification
    res.json(insertRes.rows[0]);
  } catch (err: any) {
    console.error('Error in POST /auth/register:', err);
    res.status(500).json({ error: err.message });
  }
});

// Connexion e-mail + mot de passe
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { emailOrHandle, password } = req.body;

    if (!emailOrHandle || !emailOrHandle.trim()) {
      return res.status(400).json({ error: 'Veuillez saisir votre e-mail ou pseudo' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Veuillez saisir votre mot de passe' });
    }

    const result = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference", password_hash
       FROM users
       WHERE email ILIKE $1 OR handle ILIKE $1
       LIMIT 1`,
      [emailOrHandle.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compte introuvable avec cet identifiant' });
    }

    const user = result.rows[0];

    // Vérification réelle du mot de passe en base de données
    if (!user.password_hash || user.password_hash !== password.trim()) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    const { password_hash, ...profile } = user;
    res.json(profile);
  } catch (err: any) {
    console.error('Error in POST /auth/login:', err);
    res.status(500).json({ error: err.message });
  }
});

// Connexion & Inscription Google OAuth unifiée
apiRouter.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, avatar, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email Google manquant' });
    }

    const existing = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"
       FROM users
       WHERE (google_id IS NOT NULL AND google_id = $1) OR email ILIKE $2
       LIMIT 1`,
      [googleId || '', email]
    );

    if (existing.rows.length > 0) {
      if (googleId) {
        await query(`UPDATE users SET google_id = $1 WHERE id = $2 AND (google_id IS NULL OR google_id = '')`, [googleId, existing.rows[0].id]);
      }
      return res.json(existing.rows[0]);
    }

    // Créer un nouvel utilisateur Google vierge (0 groupe, 0 ami, 0 sortie, 0 notif)
    const userId = `user-google-${googleId || Date.now()}`;
    const handle = `@${email.split('@')[0]}`;
    const userAvatar = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const insertRes = await query(
      `INSERT INTO users (id, first_name, last_name, email, handle, avatar, shares, theme_preference, password_hash, google_id)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 'light', 'google_oauth', $7)
       RETURNING id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"`,
      [userId, firstName || 'Utilisateur', lastName || '', email, handle, userAvatar, googleId || userId]
    );

    res.json(insertRes.rows[0]);
  } catch (err: any) {
    console.error('Error in POST /auth/google:', err);
    res.status(500).json({ error: err.message });
  }
});

// Demande de réinitialisation de mot de passe oublié
apiRouter.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Veuillez saisir votre adresse e-mail' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email FROM users WHERE email ILIKE $1 LIMIT 1`,
      [cleanEmail]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 heure

      await query(
        `UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3`,
        [token, expires, user.id]
      );

      const resetLink = buildAbsoluteEmailUrl(`/reset-password?token=${token}`);

      emailService.sendPasswordResetEmail({
        toEmail: user.email,
        userName: user.firstName,
        resetLink,
        token,
      }).catch((e) => console.error('Background password reset email failed:', e));
    }

    // Toujours renvoyer success: true pour des raisons de sécurité
    res.json({
      success: true,
      message: 'Si un compte est associé à cette adresse, un e-mail avec les instructions de réinitialisation a été envoyé.'
    });
  } catch (err: any) {
    console.error('Error in POST /auth/forgot-password:', err);
    res.status(500).json({ error: err.message });
  }
});

// Vérification de la validité d'un token de réinitialisation
apiRouter.get('/auth/verify-reset-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userRes = await query(
      `SELECT id, email, first_name as "firstName" FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW() LIMIT 1`,
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ valid: false, error: 'Ce lien de réinitialisation est invalide ou a expiré.' });
    }

    res.json({ valid: true, email: userRes.rows[0].email, firstName: userRes.rows[0].firstName });
  } catch (err: any) {
    console.error('Error in GET /auth/verify-reset-token:', err);
    res.status(500).json({ error: err.message });
  }
});

// Application du nouveau mot de passe
apiRouter.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({ error: 'Jeton de réinitialisation manquant' });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 4 caractères' });
    }

    const userRes = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email
       FROM users
       WHERE reset_password_token = $1 AND reset_password_expires > NOW()
       LIMIT 1`,
      [token.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({
        error: 'Ce lien de réinitialisation est invalide ou a expiré. Veuillez renouveler votre demande.'
      });
    }

    const user = userRes.rows[0];

    await query(
      `UPDATE users
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL
       WHERE id = $2`,
      [password.trim(), user.id]
    );

    res.json({
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.'
    });
  } catch (err: any) {
    console.error('Error in POST /auth/reset-password:', err);
    res.status(500).json({ error: err.message });
  }
});

// Modification du mot de passe
apiRouter.post('/users/:id/password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 4 caractères' });
    }

    const userRes = await query(`SELECT password_hash FROM users WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const user = userRes.rows[0];
    if (user.password_hash && user.password_hash !== 'default' && currentPassword && user.password_hash !== currentPassword) {
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
    }

    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newPassword, id]);
    res.json({ success: true, message: 'Mot de passe mis à jour avec succès' });
  } catch (err: any) {
    console.error('Error in POST /users/:id/password:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtenir l'utilisateur connecté ('user-me' par défaut)
apiRouter.get('/user/me', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'user-me';
    const result = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // Fallback: premier utilisateur
    const fallback = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"
       FROM users
       LIMIT 1`
    );
    if (fallback.rows.length > 0) {
      return res.json(fallback.rows[0]);
    }
    return res.status(404).json({ error: 'User not found' });
  } catch (err: any) {
    console.error('Error in GET /user/me:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour le profil utilisateur
apiRouter.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, handle, avatar, shares, themePreference } = req.body;

    const result = await query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           handle = COALESCE($4, handle),
           avatar = COALESCE($5, avatar),
           shares = COALESCE($6, shares),
           theme_preference = COALESCE($7, theme_preference)
       WHERE id = $8
       RETURNING id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"`,
      [firstName, lastName, email, handle, avatar, shares, themePreference, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    realtimeBroadcaster.broadcast({
      type: 'user:updated',
      userId: id,
      data: updatedUser,
    });

    res.json(updatedUser);
  } catch (err: any) {
    console.error('Error in PUT /users/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Suppression définitive du compte utilisateur (avec CASCADE)
apiRouter.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Suppression en cascade de toutes les données associées
    await query(`DELETE FROM notifications WHERE user_id = $1`, [id]);
    await query(`DELETE FROM event_rsvps WHERE user_id = $1`, [id]);
    await query(`DELETE FROM group_members WHERE user_id = $1`, [id]);
    await query(`DELETE FROM friends WHERE user_id = $1 OR friend_id = $1`, [id]);
    await query(`DELETE FROM logistics_tasks WHERE assigned_to_id = $1 OR created_by = $1`, [id]);
    await query(`DELETE FROM expenses WHERE paid_by_id = $1`, [id]);
    await query(`DELETE FROM chat_messages WHERE sender_id = $1`, [id]);
    await query(`DELETE FROM gallery_items WHERE uploader_id = $1`, [id]);
    await query(`DELETE FROM poll_options WHERE poll_id IN (SELECT id FROM polls WHERE created_by = $1)`, [id]);
    await query(`DELETE FROM polls WHERE created_by = $1`, [id]);
    await query(`DELETE FROM events WHERE organizer_id = $1`, [id]);
    await query(`DELETE FROM groups WHERE created_by = $1`, [id]);

    const delRes = await query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    realtimeBroadcaster.broadcast({
      type: 'user:deleted',
      userId: id,
      data: { userId: id },
    });

    res.json({ success: true, userId: id });
  } catch (err: any) {
    console.error('Error in DELETE /users/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. RELATIONS D'AMITIÉ & RECHERCHE
// ==========================================

apiRouter.get('/friends', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'user-me';
    const result = await query(
      `SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.handle, u.email, u.avatar, u.shares, f.status
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1
       ORDER BY u.first_name ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error in GET /friends:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post(['/friends', '/friends/invite'], async (req: Request, res: Response) => {
  try {
    const { userId = 'user-me', handleOrEmail, handlesOrEmails, emails } = req.body;

    const rawList: string[] = Array.isArray(handlesOrEmails)
      ? handlesOrEmails
      : (Array.isArray(emails)
          ? emails
          : (typeof handleOrEmail === 'string' && handleOrEmail ? [handleOrEmail] : []));

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleanedList = [...new Set(rawList.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))];

    if (cleanedList.length === 0) {
      return res.status(400).json({ error: 'Veuillez saisir au moins un @pseudo ou une adresse e-mail' });
    }

    // Récupérer les informations de l'expéditeur
    const senderRes = await query(`SELECT first_name as "firstName", last_name as "lastName", handle FROM users WHERE id = $1`, [userId]);
    const sender = senderRes.rows[0] || { firstName: 'Un ami', lastName: '', handle: '@ami' };
    const senderName = `${sender.firstName || 'Un ami'} ${sender.lastName || ''}`.trim();
    const appBaseUrl = getCleanAppUrl();

    const results = [];
    const isSingleLegacyMode = !Array.isArray(handlesOrEmails) && !Array.isArray(emails) && cleanedList.length === 1;

    for (const item of cleanedList) {
      const cleanHandle = item.startsWith('@') ? item : `@${item}`;

      // Recherche en base de données
      const targetUserRes = await query(
        `SELECT id, first_name as "firstName", last_name as "lastName", handle, email, avatar, shares
         FROM users
         WHERE handle ILIKE $1 OR handle ILIKE $2 OR email ILIKE $2
         LIMIT 1`,
        [cleanHandle, item]
      );

      const targetUser = targetUserRes.rows[0];

      if (targetUser) {
        // Éviter de s'ajouter soi-même
        if (targetUser.id === userId) {
          if (isSingleLegacyMode) {
            return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même en ami' });
          }
          continue;
        }

        // Insérer les relations d'amitié
        await query(
          `INSERT INTO friends (user_id, friend_id, status)
           VALUES ($1, $2, 'pending_sent')
           ON CONFLICT (user_id, friend_id)
           DO UPDATE SET status = 'pending_sent'`,
          [userId, targetUser.id]
        );

        await query(
          `INSERT INTO friends (user_id, friend_id, status)
           VALUES ($1, $2, 'pending_received')
           ON CONFLICT (user_id, friend_id)
           DO UPDATE SET status = 'pending_received'`,
          [targetUser.id, userId]
        );

        // Notification pour le destinataire
        const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const notifMessage = `${senderName} (${sender.handle || '@pseudo'}) vous a envoyé une demande d'ami.`;
        await query(
          `INSERT INTO notifications (id, user_id, type, title, message, timestamp, read)
           VALUES ($1, $2, 'invite', 'Nouvelle demande d''ami', $3, NOW(), false)`,
          [notifId, targetUser.id, notifMessage]
        );

        realtimeBroadcaster.broadcast({
          type: 'notification:created',
          userId: targetUser.id,
          data: {
            id: notifId,
            userId: targetUser.id,
            type: 'invite',
            title: "Nouvelle demande d'ami",
            message: notifMessage,
            timestamp: new Date().toISOString(),
            read: false,
          },
        });

        realtimeBroadcaster.broadcast({
          type: 'friend:requested',
          data: { senderId: userId, targetId: targetUser.id },
        });

        // Envoi d'email Resend si adresse réelle
        if (targetUser.email && !targetUser.email.endsWith('@outlys.fr') && !targetUser.email.endsWith('@outly.app')) {
          emailService.sendInvitation({
            toEmail: targetUser.email,
            senderName,
          }).catch((e) => console.error('Background Resend email invite failed:', e));
        }

        results.push({
          ...targetUser,
          status: 'pending_sent',
          type: 'user',
        });
      } else if (EMAIL_REGEX.test(item)) {
        // L'utilisateur n'existe pas encore mais c'est un e-mail valide : générer un token d'invitation externe
        const invId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const token = crypto.randomUUID();

        await query(
          `INSERT INTO invitations (id, token, email, inviter_id, type, status, created_at)
           VALUES ($1, $2, $3, $4, 'friend', 'pending', NOW())`,
          [invId, token, item.toLowerCase(), userId]
        );

        const personalInviteLink = buildAbsoluteEmailUrl(`/join?token=${token}&type=friend`);

        // Envoi Resend individuel
        emailService.sendInvitation({
          toEmail: item.toLowerCase(),
          senderName,
          inviteLink: personalInviteLink,
          token,
        }).catch((e) => console.error('Background Resend friend invite failed:', e));

        results.push({
          id: invId,
          email: item.toLowerCase(),
          token,
          firstName: item.split('@')[0],
          lastName: '',
          handle: `@${item.split('@')[0]}`,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${item}`,
          status: 'pending_sent',
          type: 'invite_pending',
        });
      } else if (isSingleLegacyMode) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
    }

    if (results.length === 0 && isSingleLegacyMode) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (isSingleLegacyMode && results[0]) {
      return res.json(results[0]);
    }

    res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (err: any) {
    console.error('Error in POST /friends:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/friends/:friendId', async (req: Request, res: Response) => {
  try {
    const userId = (req.body.userId as string) || 'user-me';
    const { friendId } = req.params;
    const { status = 'accepted' } = req.body;

    await query(
      `UPDATE friends
       SET status = $1
       WHERE (user_id = $2 AND friend_id = $3) OR (user_id = $3 AND friend_id = $2)`,
      [status, userId, friendId]
    );

    if (status === 'accepted') {
      const accepterRes = await query(`SELECT first_name FROM users WHERE id = $1`, [userId]);
      const accepterName = accepterRes.rows[0]?.first_name || 'Un ami';
      const notifMsg = `${accepterName} a accepté votre demande d'ami.`;
      
      const existingNotif = await query(
        `SELECT id FROM notifications WHERE user_id = $1 AND type = 'friend' AND message = $2`,
        [friendId, notifMsg]
      );
      if (existingNotif.rows.length === 0) {
        const notifId = `notif-${Date.now()}`;
        await query(
          `INSERT INTO notifications (id, user_id, type, title, message, timestamp, read)
           VALUES ($1, $2, 'friend', 'Demande d''ami acceptée', $3, NOW(), false)`,
          [notifId, friendId, notifMsg]
        );
        realtimeBroadcaster.broadcast({
          type: 'notification:created',
          userId: friendId,
          data: {
            id: notifId,
            userId: friendId,
            type: 'friend',
            title: "Demande d'ami acceptée",
            message: notifMsg,
            timestamp: new Date().toISOString(),
            read: false,
          },
        });
      }
    }

    realtimeBroadcaster.broadcast({
      type: 'friend:updated',
      data: { userId, friendId, status },
    });

    res.json({ success: true, friendId, status });
  } catch (err: any) {
    console.error('Error in PUT /friends/:friendId:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/friends/:friendId', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'user-me';
    const { friendId } = req.params;

    await query(
      `DELETE FROM friends
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    realtimeBroadcaster.broadcast({
      type: 'friend:deleted',
      data: { userId, friendId },
    });

    res.json({ success: true, friendId });
  } catch (err: any) {
    console.error('Error in DELETE /friends/:friendId:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. GROUPES & MEMBRES
// ==========================================

apiRouter.get('/groups', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;

    let groupsSql = `
      SELECT g.id, g.name, g.description, g.cover_image as "coverImage", g.created_at as "createdAt"
      FROM groups g
    `;
    const params: any[] = [];
    if (userId) {
      groupsSql += `
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = $1
      `;
      params.push(userId);
    }
    groupsSql += ` ORDER BY g.created_at ASC`;

    const groupsRes = await query(groupsSql, params);

    if (groupsRes.rows.length === 0) {
      return res.json([]);
    }

    const groupIds = groupsRes.rows.map((g) => g.id);
    const membersRes = await query(
      `SELECT gm.group_id as "groupId", u.id, u.id as "userId", u.first_name as "firstName", u.last_name as "lastName",
              concat(u.first_name, ' ', u.last_name) as name, u.handle, u.avatar, u.shares, gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ANY($1::text[])
       ORDER BY gm.joined_at ASC`,
      [groupIds]
    );

    const membersByGroup: Record<string, any[]> = {};
    for (const m of membersRes.rows) {
      if (!membersByGroup[m.groupId]) {
        membersByGroup[m.groupId] = [];
      }
      const uid = m.userId || m.id;
      const alreadyInList = membersByGroup[m.groupId].some(
        (existing) => (existing.userId || existing.id) === uid
      );
      if (!alreadyInList) {
        membersByGroup[m.groupId].push({
          id: m.id,
          userId: m.userId,
          firstName: m.firstName,
          lastName: m.lastName,
          name: m.name.trim(),
          handle: m.handle,
          avatar: m.avatar,
          shares: m.shares,
          role: m.role,
        });
      }
    }

    const fullGroups = groupsRes.rows.map((g) => ({
      ...g,
      members: membersByGroup[g.id] || [],
    }));

    res.json(fullGroups);
  } catch (err: any) {
    console.error('Error in GET /groups:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/groups', async (req: Request, res: Response) => {
  try {
    const { name, description, coverImage, creatorId = 'user-me', invitedFriendIds = [] } = req.body;
    const groupId = `group-${Date.now()}`;

    await query(
      `INSERT INTO groups (id, name, description, cover_image, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        groupId,
        name || 'Nouveau Groupe',
        description || '',
        coverImage || 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1000&auto=format&fit=crop&q=80',
      ]
    );

    // Insérer le créateur en tant qu'admin
    await query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [groupId, creatorId]
    );

    // Insérer les membres invités
    for (const fId of invitedFriendIds) {
      await query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'member', NOW())
         ON CONFLICT DO NOTHING`,
        [groupId, fId]
      );
    }

    // Récupérer le groupe complet avec ses membres
    const membersRes = await query(
      `SELECT u.id, u.id as "userId", u.first_name as "firstName", u.last_name as "lastName",
              concat(u.first_name, ' ', u.last_name) as name, u.handle, u.avatar, u.shares, gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1`,
      [groupId]
    );

    const createdGroup = {
      id: groupId,
      name,
      description,
      coverImage,
      createdAt: new Date().toISOString(),
      members: membersRes.rows,
    };

    realtimeBroadcaster.broadcast({
      type: 'group:created',
      groupId,
      data: createdGroup,
    });

    res.json(createdGroup);
  } catch (err: any) {
    console.error('Error in POST /groups:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un membre à un groupe spécifique
apiRouter.post('/groups/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role, joined_at = NOW()`,
      [id, userId, role]
    );

    const memberRes = await query(
      `SELECT u.id, u.id as "userId", u.first_name as "firstName", u.last_name as "lastName",
              concat(u.first_name, ' ', u.last_name) as name, u.handle, u.avatar, u.shares, gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND gm.user_id = $2`,
      [id, userId]
    );

    const memberData = memberRes.rows[0] || { success: true, groupId: id, userId, role };

    realtimeBroadcaster.broadcast({
      type: 'group:member_added',
      groupId: id,
      data: { groupId: id, member: memberData },
    });

    res.json(memberData);
  } catch (err: any) {
    console.error('Error in POST /groups/:id/members:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un membre virtuel (sans compte Outlys)
apiRouter.post('/groups/:id/virtual-member', async (req: Request, res: Response) => {
  try {
    const { id: groupId } = req.params;
    const { firstName, name, avatar = '/Avatar_Lapin.jpg', shares = 1 } = req.body;
    const trimmedFirstName = (firstName || name || 'Invité').trim();
    if (!trimmedFirstName) {
      return res.status(400).json({ error: 'Le prénom du participant est requis' });
    }

    const virtualUserId = `user-virt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const randomHandle = `@${trimmedFirstName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 6)}`;
    const dummyEmail = `${virtualUserId}@outlys.local`;

    await query(
      `INSERT INTO users (id, first_name, last_name, email, handle, avatar, shares, created_at)
       VALUES ($1, $2, '', $3, $4, $5, $6, NOW())`,
      [virtualUserId, trimmedFirstName, dummyEmail, randomHandle, avatar, shares || 1]
    );

    await query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, 'member', NOW())`,
      [groupId, virtualUserId]
    );

    const memberData = {
      id: virtualUserId,
      userId: virtualUserId,
      firstName: trimmedFirstName,
      lastName: '',
      name: trimmedFirstName,
      handle: randomHandle,
      avatar,
      shares: shares || 1,
      role: 'member',
      isVirtual: true,
    };

    realtimeBroadcaster.broadcast({
      type: 'group:member_added',
      groupId,
      data: { groupId, member: memberData },
    });

    res.json(memberData);
  } catch (err: any) {
    console.error('Error in POST /groups/:id/virtual-member:', err);
    res.status(500).json({ error: err.message });
  }
});

// Modifier les paramètres d'un groupe (Nom, image de couverture, description)
apiRouter.put('/groups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, coverImage } = req.body;

    const existingRes = await query(`SELECT id, name, description, cover_image FROM groups WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Groupe introuvable' });
    }

    const current = existingRes.rows[0];
    const newName = name !== undefined ? name.trim() : current.name;
    const newDesc = description !== undefined ? description : current.description;
    const newCover = coverImage !== undefined ? coverImage : current.cover_image;

    await query(
      `UPDATE groups
       SET name = $1, description = $2, cover_image = $3
       WHERE id = $4`,
      [newName, newDesc, newCover, id]
    );

    const updatedRes = await query(
      `SELECT id, name, description, cover_image as "coverImage", created_at as "createdAt"
       FROM groups
       WHERE id = $1`,
      [id]
    );

    const membersRes = await query(
      `SELECT u.id, u.id as "userId", u.first_name as "firstName", u.last_name as "lastName",
              concat(u.first_name, ' ', u.last_name) as name, u.handle, u.avatar, u.shares, gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1`,
      [id]
    );

    const updatedGroup = {
      ...updatedRes.rows[0],
      members: membersRes.rows,
    };

    realtimeBroadcaster.broadcast({
      type: 'group:updated',
      groupId: id,
      data: updatedGroup,
    });

    res.json(updatedGroup);
  } catch (err: any) {
    console.error('Error in PUT /groups/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Inviter des membres par lot dans un groupe (avec tokens individuels et emails Resend dédiés)
apiRouter.post('/groups/:id/invite', async (req: Request, res: Response) => {
  try {
    const { id: groupId } = req.params;
    const { emails, email, toEmail, senderName, senderId = 'user-me' } = req.body;

    const rawEmails: string[] = Array.isArray(emails)
      ? emails
      : (typeof email === 'string' && email ? [email] : (typeof toEmail === 'string' && toEmail ? [toEmail] : []));

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleaned = rawEmails
      .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
      .filter((e) => EMAIL_REGEX.test(e));
    const uniqueEmails = [...new Set(cleaned)];

    if (uniqueEmails.length === 0) {
      return res.status(400).json({ error: 'Veuillez renseigner au moins une adresse e-mail valide' });
    }

    // Récupérer les informations du groupe
    const groupRes = await query(`SELECT id, name FROM groups WHERE id = $1`, [groupId]);
    const group = groupRes.rows[0];
    const groupName = group?.name || 'Groupe';

    // Récupérer l'expéditeur
    const senderRes = await query(`SELECT first_name as "firstName", last_name as "lastName" FROM users WHERE id = $1`, [senderId]);
    const sender = senderRes.rows[0];
    const resolvedSenderName = senderName || (sender ? `${sender.firstName} ${sender.lastName || ''}`.trim() : 'Un ami');

    const appBaseUrl = getCleanAppUrl();
    const emailBatchPayload = [];
    const generatedInvitations = [];

    for (const targetEmail of uniqueEmails) {
      const invId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const token = crypto.randomUUID();

      await query(
        `INSERT INTO invitations (id, token, email, group_id, inviter_id, type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'group', 'pending', NOW())`,
        [invId, token, targetEmail, groupId, senderId]
      );

      const inviteLink = buildAbsoluteEmailUrl(`/join/${groupId}?token=${token}`);

      emailBatchPayload.push({
        toEmail: targetEmail,
        senderName: resolvedSenderName,
        groupName,
        inviteLink,
        token,
      });

      generatedInvitations.push({
        id: invId,
        token,
        email: targetEmail,
        groupId,
        inviteLink,
      });
    }

    // Envoi individuel à chaque destinataire via Resend (confidentialité garantie)
    const sendResult = await emailService.sendBatchInvitations(emailBatchPayload);

    realtimeBroadcaster.broadcast({
      type: 'group:invitations_sent',
      groupId,
      data: { groupId, count: uniqueEmails.length, emails: uniqueEmails },
    });

    res.json({
      success: true,
      count: uniqueEmails.length,
      results: sendResult.results,
      invitations: generatedInvitations,
    });
  } catch (err: any) {
    console.error('Error in POST /groups/:id/invite:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/groups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM groups WHERE id = $1`, [id]);

    realtimeBroadcaster.broadcast({
      type: 'group:deleted',
      groupId: id,
      data: { groupId: id },
    });

    res.json({ success: true, groupId: id });
  } catch (err: any) {
    console.error('Error in DELETE /groups/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/groups/:id/members/:userId', async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;

    // Vérifier si le membre qui quitte était administrateur
    const memberRoleRes = await query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [id, userId]
    );
    const wasAdmin = memberRoleRes.rows[0]?.role === 'admin';

    await query(`DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`, [id, userId]);

    // Règle de succession : si l'admin part et qu'il ne reste aucun autre admin, promouvoir le premier membre restant par ordre alphabétique
    if (wasAdmin) {
      const remainingAdmins = await query(
        `SELECT user_id FROM group_members WHERE group_id = $1 AND role = 'admin'`,
        [id]
      );
      if (remainingAdmins.rows.length === 0) {
        const nextAdminCandidate = await query(
          `SELECT gm.user_id 
           FROM group_members gm
           JOIN users u ON gm.user_id = u.id
           WHERE gm.group_id = $1
           ORDER BY u.first_name ASC, u.last_name ASC
           LIMIT 1`,
          [id]
        );
        if (nextAdminCandidate.rows.length > 0) {
          const newAdminId = nextAdminCandidate.rows[0].user_id;
          await query(
            `UPDATE group_members SET role = 'admin' WHERE group_id = $1 AND user_id = $2`,
            [id, newAdminId]
          );
        }
      }
    }

    realtimeBroadcaster.broadcast({
      type: 'group:member_removed',
      groupId: id,
      data: { groupId: id, userId },
    });

    res.json({ success: true, groupId: id, userId });
  } catch (err: any) {
    console.error('Error in DELETE /groups/:id/members/:userId:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. ÉVÉNEMENTS & RSVP & ÉDITION / SUPPRESSION
// ==========================================

apiRouter.get('/events', async (req: Request, res: Response) => {
  try {
    // Si la requête demande un flux SSE via Accept header ou query param
    if (req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true') {
      return handleSseConnection(req, res);
    }

    const groupId = req.query.groupId as string | undefined;
    const userId = req.query.userId as string | undefined;

    let sql = `
      SELECT e.id, e.group_id as "groupId", e.title, e.start_datetime as "startDateTime",
             e.end_datetime as "endDateTime", e.location, e.gps_url as "gpsUrl",
             e.description, e.banner_image as "bannerImage", e.organizer_id as "organizerId",
             COALESCE(u.first_name, 'Organisateur') as "organizerName",
             COALESCE(u.avatar, '') as "organizerAvatar",
             e.reminder_24h as "reminder24h"
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
    `;
    const params: any[] = [];
    if (groupId) {
      sql += ` WHERE e.group_id = $1`;
      params.push(groupId);
    } else if (userId) {
      sql += ` WHERE e.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)`;
      params.push(userId);
    }
    sql += ` ORDER BY e.start_datetime ASC`;

    const eventsRes = await query(sql, params);

    // Charger les RSVP
    const rsvpRes = await query(`SELECT event_id as "eventId", user_id as "userId", status FROM event_rsvps`);
    const rsvpByEvent: Record<string, Record<string, string>> = {};
    for (const r of rsvpRes.rows) {
      if (!rsvpByEvent[r.eventId]) {
        rsvpByEvent[r.eventId] = {};
      }
      rsvpByEvent[r.eventId][r.userId] = r.status;
    }

    const fullEvents = eventsRes.rows.map((ev) => ({
      ...ev,
      rsvp: rsvpByEvent[ev.id] || {},
    }));

    res.json(fullEvents);
  } catch (err: any) {
    console.error('Error in GET /events:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const {
      groupId,
      title,
      startDateTime,
      endDateTime,
      location,
      gpsUrl,
      description,
      bannerImage,
      organizerId = 'user-me',
      reminder24h = true,
      rsvp = {},
    } = req.body;

    const eventId = `evt-${Date.now()}`;

    await query(
      `INSERT INTO events (id, group_id, title, start_datetime, end_datetime, location, gps_url, description, banner_image, organizer_id, reminder_24h)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        eventId,
        groupId,
        title,
        startDateTime,
        endDateTime || null,
        location || '',
        gpsUrl || null,
        description || '',
        bannerImage || null,
        organizerId,
        reminder24h,
      ]
    );

    // Insérer le RSVP de l'organisateur et autres
    const initialRsvp: Record<string, string> = {
      [organizerId]: 'going',
      ...rsvp,
    };

    for (const [uId, st] of Object.entries(initialRsvp)) {
      await query(
        `INSERT INTO event_rsvps (event_id, user_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
        [eventId, uId, st]
      );
    }

    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [organizerId]);
    const org = userRes.rows[0] || { first_name: 'Organisateur', avatar: '' };

    const newEvent = {
      id: eventId,
      groupId,
      title,
      startDateTime,
      endDateTime,
      location,
      gpsUrl,
      description,
      bannerImage,
      organizerId,
      organizerName: org.first_name,
      organizerAvatar: org.avatar,
      reminder24h,
      rsvp: initialRsvp,
    };

    realtimeBroadcaster.broadcast({
      type: 'event:created',
      groupId,
      data: newEvent,
    });

    res.json(newEvent);
  } catch (err: any) {
    console.error('Error in POST /events:', err);
    res.status(500).json({ error: err.message });
  }
});

// Édition complète d'un événement
apiRouter.put('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      startDateTime,
      endDateTime,
      location,
      gpsUrl,
      description,
      bannerImage,
      reminder24h,
    } = req.body;

    const result = await query(
      `UPDATE events
       SET title = COALESCE($1, title),
           start_datetime = COALESCE($2, start_datetime),
           end_datetime = $3,
           location = COALESCE($4, location),
           gps_url = $5,
           description = COALESCE($6, description),
           banner_image = $7,
           reminder_24h = COALESCE($8, reminder_24h)
       WHERE id = $9
       RETURNING *`,
      [
        title,
        startDateTime,
        endDateTime || null,
        location,
        gpsUrl || null,
        description,
        bannerImage || null,
        reminder24h,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const ev = result.rows[0];

    // Récupérer l'organisateur et RSVPs
    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [ev.organizer_id]);
    const org = userRes.rows[0] || { first_name: 'Organisateur', avatar: '' };

    const rsvpRes = await query(`SELECT user_id as "userId", status FROM event_rsvps WHERE event_id = $1`, [id]);
    const rsvp: Record<string, string> = {};
    for (const r of rsvpRes.rows) {
      rsvp[r.userId] = r.status;
    }

    const updatedEvent = {
      id: ev.id,
      groupId: ev.group_id,
      title: ev.title,
      startDateTime: ev.start_datetime,
      endDateTime: ev.end_datetime,
      location: ev.location,
      gpsUrl: ev.gps_url,
      description: ev.description,
      bannerImage: ev.banner_image,
      organizerId: ev.organizer_id,
      organizerName: org.first_name,
      organizerAvatar: org.avatar,
      reminder24h: ev.reminder_24h,
      rsvp,
    };

    realtimeBroadcaster.broadcast({
      type: 'event:updated',
      groupId: ev.group_id,
      data: updatedEvent,
    });

    res.json(updatedEvent);
  } catch (err: any) {
    console.error('Error in PUT /events/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Suppression d'un événement
apiRouter.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT group_id as "groupId" FROM events WHERE id = $1`, [id]);
    const groupId = existing.rows[0]?.groupId;

    await query(`DELETE FROM events WHERE id = $1`, [id]);

    realtimeBroadcaster.broadcast({
      type: 'event:deleted',
      groupId,
      data: { eventId: id, groupId },
    });

    res.json({ success: true, eventId: id });
  } catch (err: any) {
    console.error('Error in DELETE /events/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/events/:id/rsvp', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId = 'user-me', status } = req.body;

    await query(
      `INSERT INTO event_rsvps (event_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET status = EXCLUDED.status`,
      [id, userId, status]
    );

    const evRes = await query(`SELECT group_id as "groupId" FROM events WHERE id = $1`, [id]);
    const groupId = evRes.rows[0]?.groupId;

    realtimeBroadcaster.broadcast({
      type: 'event:rsvp',
      groupId,
      data: { eventId: id, userId, status },
    });

    res.json({ success: true, eventId: id, userId, status });
  } catch (err: any) {
    console.error('Error in PUT /events/:id/rsvp:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. ASSISTANT DE PLANIFICATION COLLECTIF (STYLE TEAMS)
// ==========================================

apiRouter.get('/availability', async (req: Request, res: Response) => {
  try {
    const { groupId, date } = req.query;

    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const targetDateStr = (date as string) || new Date().toISOString().split('T')[0];
    const tzOffsetMinutes = req.query.tz ? Number(req.query.tz) : 0;

    // Récupérer les membres du groupe
    const membersRes = await query(
      `SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.avatar
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY u.first_name ASC`,
      [groupId]
    );

    // Récupérer les événements confirmés pour tous les membres ce jour-là
    const eventsRes = await query(
      `SELECT e.id, e.start_datetime as "startDateTime", e.end_datetime as "endDateTime", r.user_id as "userId"
       FROM event_rsvps r
       JOIN events e ON r.event_id = e.id
       WHERE r.status = 'going'
         AND (e.start_datetime::date = $1::date OR (e.end_datetime IS NOT NULL AND e.end_datetime::date >= $1::date AND e.start_datetime::date <= $1::date))`,
      [targetDateStr]
    );

    // Heures de 00:00 à 23:00 (24 heures complètes)
    const timeSlots = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const [selYear, selMonth, selDay] = targetDateStr.split('-').map(Number);

    const availability = membersRes.rows.map((member) => {
      const memberEvents = eventsRes.rows.filter((ev) => ev.userId === member.id);

      const slots = timeSlots.map((slot) => {
        const [hour] = slot.split(':').map(Number);
        const slotStartMs = Date.UTC(selYear, selMonth - 1, selDay, hour, 0, 0) + (tzOffsetMinutes * 60 * 1000);
        const slotEndMs = slotStartMs + 3600000;

        const isBusy = memberEvents.some((ev) => {
          const start = new Date(ev.startDateTime).getTime();
          const end = ev.endDateTime ? new Date(ev.endDateTime).getTime() : start + 3600000;
          return start < slotEndMs && end > slotStartMs;
        });

        return {
          time: slot,
          status: isBusy ? ('busy' as const) : ('free' as const),
          label: isBusy ? 'Occupé(e)' : 'Libre',
        };
      });

      return {
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`.trim(),
        memberAvatar: member.avatar,
        slots,
      };
    });

    res.json({
      date: targetDateStr,
      timeSlots,
      members: availability,
    });
  } catch (err: any) {
    console.error('Error in GET /availability:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. DISCUSSION & MESSAGES & RÉACTIONS EMOJIS
// ==========================================

apiRouter.get('/messages', async (req: Request, res: Response) => {
  try {
    const groupId = req.query.groupId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const before = req.query.before as string | undefined;

    let baseSql = `
      SELECT m.id, m.group_id as "groupId", m.sender_id as "senderId",
             CASE
               WHEN m.is_system THEN 'Outlys Bot'
               ELSE COALESCE(concat(u.first_name, ' ', u.last_name), 'Membre')
             END as "senderName",
             COALESCE(u.avatar, '') as "senderAvatar",
             m.timestamp, m.text, m.image_url as "imageUrl",
             m.is_system as "isSystem", m.system_type as "systemType",
             COALESCE(m.read_by, '[]'::jsonb) as "readBy",
             COALESCE(m.reactions, '[]'::jsonb) as reactions
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (groupId) {
      params.push(groupId);
      conditions.push(`m.group_id = $${params.length}`);
    }

    if (before) {
      params.push(before);
      conditions.push(`m.timestamp < $${params.length}`);
    }

    if (conditions.length > 0) {
      baseSql += ` WHERE ` + conditions.join(' AND ');
    }

    if (limit && limit > 0) {
      params.push(limit);
      const sql = `
        SELECT * FROM (
          ${baseSql}
          ORDER BY m.timestamp DESC
          LIMIT $${params.length}
        ) sub
        ORDER BY sub.timestamp ASC
      `;
      const result = await query(sql, params);
      return res.json(result.rows);
    } else {
      baseSql += ` ORDER BY m.timestamp ASC`;
      const result = await query(baseSql, params);
      return res.json(result.rows);
    }
  } catch (err: any) {
    console.error('Error in GET /messages:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/messages', async (req: Request, res: Response) => {
  try {
    const {
      id = `msg-${Date.now()}`,
      groupId,
      senderId = 'user-me',
      text = '',
      imageUrl = null,
      isSystem = false,
      systemType = null,
      readBy = ['user-me'],
      reactions = [],
      timestamp = new Date().toISOString(),
    } = req.body;

    await query(
      `INSERT INTO chat_messages (id, group_id, sender_id, timestamp, text, image_url, is_system, system_type, read_by, reactions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        groupId,
        senderId,
        timestamp,
        text,
        imageUrl,
        isSystem,
        systemType,
        JSON.stringify(readBy),
        JSON.stringify(reactions),
      ]
    );

    // Si une image est jointe au message, on l'ajoute automatiquement à la galerie si elle n'y figure pas déjà
    if (imageUrl) {
      const existingGal = await query(
        `SELECT id FROM gallery_items WHERE group_id = $1 AND image_url = $2`,
        [groupId, imageUrl]
      );
      if (existingGal.rows.length === 0) {
        const galId = `gal-${Date.now()}`;
        await query(
          `INSERT INTO gallery_items (id, group_id, image_url, uploader_id, caption, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [galId, groupId, imageUrl, senderId, text || 'Photo partagée dans le fil', timestamp]
        );
        realtimeBroadcaster.broadcast({
          type: 'gallery:uploaded',
          groupId,
          data: {
            id: galId,
            groupId,
            imageUrl,
            uploaderId: senderId,
            caption: text || 'Photo partagée dans le fil',
            timestamp,
          },
        });
      }
    }

    const userRes = await query(`SELECT first_name, last_name, avatar FROM users WHERE id = $1`, [senderId]);
    const user = userRes.rows[0];
    const senderName = isSystem
      ? 'Outlys Bot'
      : user
      ? `${user.first_name} ${user.last_name}`.trim()
      : 'Membre';
    const senderAvatar = isSystem ? '' : user?.avatar || '';

    const newMsg = {
      id,
      groupId,
      senderId,
      senderName,
      senderAvatar,
      timestamp,
      text,
      imageUrl,
      isSystem,
      systemType,
      readBy,
      reactions,
    };

    realtimeBroadcaster.broadcast({
      type: 'message:created',
      groupId,
      data: newMsg,
    });

    res.json(newMsg);
  } catch (err: any) {
    console.error('Error in POST /messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Modifier un message existant (uniquement par son auteur)
apiRouter.put('/messages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Le contenu du message est requis' });
    }

    const updatedRes = await query(
      `UPDATE chat_messages
       SET text = $1
       WHERE id = $2
       RETURNING id, group_id as "groupId", sender_id as "senderId", timestamp, text, image_url as "imageUrl", is_system as "isSystem", system_type as "systemType", read_by as "readBy", reactions`,
      [text.trim(), id]
    );

    if (updatedRes.rows.length === 0) {
      return res.status(404).json({ error: 'Message introuvable' });
    }

    const msg = updatedRes.rows[0];
    const userRes = await query(`SELECT first_name, last_name, avatar FROM users WHERE id = $1`, [msg.senderId]);
    const user = userRes.rows[0];
    const senderName = msg.isSystem ? 'Outlys Bot' : user ? `${user.first_name} ${user.last_name}`.trim() : 'Membre';
    const senderAvatar = msg.isSystem ? '' : user?.avatar || '';

    const fullMessage = {
      ...msg,
      senderName,
      senderAvatar,
    };

    realtimeBroadcaster.broadcast({
      type: 'message:updated',
      groupId: msg.groupId,
      data: fullMessage,
    });

    res.json(fullMessage);
  } catch (err: any) {
    console.error('Error in PUT /messages/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un message
apiRouter.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT id, group_id as "groupId" FROM chat_messages WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Message introuvable' });
    }

    const groupId = existing.rows[0].groupId;
    await query(`DELETE FROM chat_messages WHERE id = $1`, [id]);

    realtimeBroadcaster.broadcast({
      type: 'message:deleted',
      groupId,
      data: { id, groupId },
    });

    res.json({ success: true, id, groupId });
  } catch (err: any) {
    console.error('Error in DELETE /messages/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Réaction emoji (sur n'importe quel message, y compris ses propres messages)
apiRouter.post('/messages/:id/react', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { emoji, userId = 'user-me' } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const msgRes = await query(`SELECT group_id as "groupId", reactions FROM chat_messages WHERE id = $1`, [id]);
    if (msgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const groupId = msgRes.rows[0].groupId;
    let reactions: Array<{ emoji: string; users: string[] }> = msgRes.rows[0].reactions || [];

    const existingEmojiGroup = reactions.find((r) => r.emoji === emoji);

    if (existingEmojiGroup) {
      if (existingEmojiGroup.users.includes(userId)) {
        // Retirer la réaction
        existingEmojiGroup.users = existingEmojiGroup.users.filter((u) => u !== userId);
      } else {
        // Ajouter l'utilisateur
        existingEmojiGroup.users.push(userId);
      }
    } else {
      // Nouveau groupe d'emoji
      reactions.push({
        emoji,
        users: [userId],
      });
    }

    // Filtrer les emojis qui n'ont plus d'utilisateurs
    reactions = reactions.filter((r) => r.users.length > 0);

    await query(
      `UPDATE chat_messages SET reactions = $1 WHERE id = $2`,
      [JSON.stringify(reactions), id]
    );

    realtimeBroadcaster.broadcast({
      type: 'message:reaction',
      groupId,
      data: { messageId: id, groupId, reactions },
    });

    res.json({ success: true, messageId: id, reactions });
  } catch (err: any) {
    console.error('Error in POST /messages/:id/react:', err);
    res.status(500).json({ error: err.message });
  }
});

// Marquer tous les messages d'un groupe comme lus pour un utilisateur
apiRouter.post('/groups/:groupId/messages/read', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { userId = 'user-me' } = req.body;

    if (!groupId || !userId) {
      return res.status(400).json({ error: 'groupId and userId are required' });
    }

    await query(
      `UPDATE chat_messages
       SET read_by = CASE
         WHEN read_by IS NULL OR jsonb_typeof(read_by) != 'array' THEN jsonb_build_array($1::text)
         WHEN NOT (read_by ? $1) THEN read_by || jsonb_build_array($1::text)
         ELSE read_by
       END
       WHERE group_id = $2 AND (read_by IS NULL OR NOT (read_by ? $1))`,
      [userId, groupId]
    );

    realtimeBroadcaster.broadcast({
      type: 'message:read',
      groupId,
      data: { groupId, userId },
    });

    res.json({ success: true, groupId, userId });
  } catch (err: any) {
    console.error('Error in POST /groups/:groupId/messages/read:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. SONDAGES & VOTES
// ==========================================

apiRouter.get('/polls', async (req: Request, res: Response) => {
  try {
    const groupId = req.query.groupId as string | undefined;
    let sql = `
      SELECT p.id, p.group_id as "groupId", p.title, p.type, p.description,
             p.created_by as "createdBy",
             COALESCE(u.first_name, 'Membre') as "creatorName",
             COALESCE(u.avatar, '') as "creatorAvatar",
             p.created_at as "createdAt"
      FROM polls p
      LEFT JOIN users u ON p.created_by = u.id
    `;
    const params: any[] = [];
    if (groupId) {
      sql += ` WHERE p.group_id = $1`;
      params.push(groupId);
    }
    sql += ` ORDER BY p.created_at DESC`;

    const pollsRes = await query(sql, params);

    const optionsRes = await query(
      `SELECT id, poll_id as "pollId", text, date_value as "dateValue", end_date_value as "endDateValue", COALESCE(votes, '[]'::jsonb) as votes
       FROM poll_options`
    );

    const optionsByPoll: Record<string, any[]> = {};
    for (const opt of optionsRes.rows) {
      if (!optionsByPoll[opt.pollId]) {
        optionsByPoll[opt.pollId] = [];
      }
      optionsByPoll[opt.pollId].push({
        id: opt.id,
        text: opt.text,
        dateValue: opt.dateValue,
        endDateValue: opt.endDateValue,
        startDate: opt.dateValue,
        endDate: opt.endDateValue,
        votes: opt.votes,
      });
    }

    const fullPolls = pollsRes.rows.map((p) => ({
      ...p,
      options: optionsByPoll[p.id] || [],
    }));

    res.json(fullPolls);
  } catch (err: any) {
    console.error('Error in GET /polls:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/polls', async (req: Request, res: Response) => {
  try {
    const { groupId, title, type, description, createdBy = 'user-me', options = [] } = req.body;
    const pollId = `poll-${Date.now()}`;

    await query(
      `INSERT INTO polls (id, group_id, title, type, description, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [pollId, groupId, title, type, description || null, createdBy]
    );

    const createdOptions = [];
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const optId = `opt-${Date.now()}-${i}`;
      const startDateVal = opt.startDate || opt.dateValue || null;
      const endDateVal = opt.endDate || opt.endDateValue || null;

      await query(
        `INSERT INTO poll_options (id, poll_id, text, date_value, end_date_value, votes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [optId, pollId, opt.text, startDateVal, endDateVal, JSON.stringify(opt.votes || [])]
      );
      createdOptions.push({
        id: optId,
        text: opt.text,
        dateValue: startDateVal,
        endDateValue: endDateVal,
        startDate: startDateVal,
        endDate: endDateVal,
        votes: opt.votes || [],
      });
    }

    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [createdBy]);
    const user = userRes.rows[0];

    const createdPoll = {
      id: pollId,
      groupId,
      title,
      type,
      description,
      createdBy,
      creatorName: user?.first_name || 'Membre',
      creatorAvatar: user?.avatar || '',
      createdAt: new Date().toISOString(),
      options: createdOptions,
    };

    realtimeBroadcaster.broadcast({
      type: 'poll:created',
      groupId,
      data: createdPoll,
    });

    res.json(createdPoll);
  } catch (err: any) {
    console.error('Error in POST /polls:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/polls/:pollId/vote', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;
    const { optionId, userId = 'user-me', status = 'available' } = req.body;

    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [userId]);
    const user = userRes.rows[0] || { first_name: 'Utilisateur', avatar: '' };

    const optRes = await query(`SELECT id, votes FROM poll_options WHERE id = $1 AND poll_id = $2`, [optionId, pollId]);
    if (optRes.rows.length === 0) {
      return res.status(404).json({ error: 'Option not found' });
    }

    const currentVotes: any[] = optRes.rows[0].votes || [];
    const otherVotes = currentVotes.filter((v: any) => v.userId !== userId);
    const updatedVotes = [
      ...otherVotes,
      {
        userId,
        userName: user.first_name,
        userAvatar: user.avatar,
        status,
      },
    ];

    await query(`UPDATE poll_options SET votes = $1 WHERE id = $2`, [JSON.stringify(updatedVotes), optionId]);

    const pRes = await query(`SELECT group_id as "groupId" FROM polls WHERE id = $1`, [pollId]);
    const groupId = pRes.rows[0]?.groupId;

    realtimeBroadcaster.broadcast({
      type: 'poll:voted',
      groupId,
      data: { pollId, optionId, votes: updatedVotes },
    });

    res.json({ success: true, pollId, optionId, votes: updatedVotes });
  } catch (err: any) {
    console.error('Error in POST /polls/:pollId/vote:', err);
    res.status(500).json({ error: err.message });
  }
});

// Modifier un sondage existant
apiRouter.put('/polls/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, type, description, options = [] } = req.body;

    const pollRes = await query(
      `UPDATE polls
       SET title = COALESCE($1, title),
           type = COALESCE($2, type),
           description = COALESCE($3, description)
       WHERE id = $4
       RETURNING *`,
      [title, type, description, id]
    );

    if (pollRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sondage introuvable' });
    }

    const poll = pollRes.rows[0];

    // If options are provided, update options
    if (options && options.length > 0) {
      // Get existing options to preserve votes if ID matches
      const existingOptsRes = await query(`SELECT id, votes FROM poll_options WHERE poll_id = $1`, [id]);
      const existingVotesMap = new Map<string, any>();
      for (const row of existingOptsRes.rows) {
        existingVotesMap.set(row.id, row.votes || []);
      }

      await query(`DELETE FROM poll_options WHERE poll_id = $1`, [id]);

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optId = opt.id && !opt.id.startsWith('temp-') ? opt.id : `opt-${Date.now()}-${i}`;
        const startDateVal = opt.startDate || opt.dateValue || null;
        const endDateVal = opt.endDate || opt.endDateValue || null;
        const votes = opt.votes || existingVotesMap.get(opt.id) || [];

        await query(
          `INSERT INTO poll_options (id, poll_id, text, date_value, end_date_value, votes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [optId, id, opt.text, startDateVal, endDateVal, JSON.stringify(votes)]
        );
      }
    }

    const updatedOptionsRes = await query(
      `SELECT id, text, date_value as "dateValue", end_date_value as "endDateValue", votes
       FROM poll_options
       WHERE poll_id = $1`,
      [id]
    );

    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [poll.created_by]);
    const user = userRes.rows[0];

    const updatedPoll = {
      id: poll.id,
      groupId: poll.group_id,
      title: poll.title,
      type: poll.type,
      description: poll.description,
      createdBy: poll.created_by,
      creatorName: user?.first_name || 'Membre',
      creatorAvatar: user?.avatar || '',
      createdAt: poll.created_at,
      options: updatedOptionsRes.rows.map((opt) => ({
        id: opt.id,
        text: opt.text,
        dateValue: opt.dateValue,
        endDateValue: opt.endDateValue,
        startDate: opt.dateValue,
        endDate: opt.endDateValue,
        votes: opt.votes || [],
      })),
    };

    realtimeBroadcaster.broadcast({
      type: 'poll:updated',
      groupId: poll.group_id,
      data: updatedPoll,
    });

    res.json(updatedPoll);
  } catch (err: any) {
    console.error('Error in PUT /polls/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer ou archiver un sondage après conversion
apiRouter.delete('/polls/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT group_id as "groupId" FROM polls WHERE id = $1`, [id]);
    const groupId = existing.rows[0]?.groupId;

    await query(`DELETE FROM poll_options WHERE poll_id = $1`, [id]);
    await query(`DELETE FROM polls WHERE id = $1`, [id]);

    realtimeBroadcaster.broadcast({
      type: 'poll:deleted',
      groupId,
      data: { pollId: id, groupId },
    });

    res.json({ success: true, pollId: id });
  } catch (err: any) {
    console.error('Error in DELETE /polls/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. GALERIE MÉDIAS
// ==========================================

apiRouter.get('/gallery', async (req: Request, res: Response) => {
  try {
    const groupId = req.query.groupId as string | undefined;
    let sql = `
      SELECT g.id, g.group_id as "groupId", g.image_url as "imageUrl",
             g.uploader_id as "uploaderId",
             COALESCE(concat(u.first_name, ' ', u.last_name), 'Membre') as "uploaderName",
             COALESCE(u.avatar, '') as "uploaderAvatar",
             g.caption, g.timestamp
      FROM gallery_items g
      LEFT JOIN users u ON g.uploader_id = u.id
    `;
    const params: any[] = [];
    if (groupId) {
      sql += ` WHERE g.group_id = $1`;
      params.push(groupId);
    }
    sql += ` ORDER BY g.timestamp DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error in GET /gallery:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/gallery', async (req: Request, res: Response) => {
  try {
    const {
      groupId,
      imageUrl,
      uploaderId = 'user-me',
      caption = '',
      timestamp = new Date().toISOString(),
    } = req.body;

    const id = `gal-${Date.now()}`;
    await query(
      `INSERT INTO gallery_items (id, group_id, image_url, uploader_id, caption, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, groupId, imageUrl, uploaderId, caption, timestamp]
    );

    const userRes = await query(`SELECT first_name, last_name, avatar FROM users WHERE id = $1`, [uploaderId]);
    const user = userRes.rows[0];

    const newItem = {
      id,
      groupId,
      imageUrl,
      uploaderId,
      uploaderName: user ? `${user.first_name} ${user.last_name}`.trim() : 'Membre',
      uploaderAvatar: user?.avatar || '',
      caption,
      timestamp,
    };

    realtimeBroadcaster.broadcast({
      type: 'gallery:uploaded',
      groupId,
      data: newItem,
    });

    res.json(newItem);
  } catch (err: any) {
    console.error('Error in POST /gallery:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/gallery/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT group_id as "groupId" FROM gallery_items WHERE id = $1`, [id]);
    const groupId = existing.rows[0]?.groupId;

    await query(`DELETE FROM gallery_items WHERE id = $1`, [id]);

    realtimeBroadcaster.broadcast({
      type: 'gallery:deleted',
      groupId,
      data: { id, groupId },
    });

    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error in DELETE /gallery/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. LOGISTIQUE & TÂCHES
// ==========================================

apiRouter.get('/tasks', async (req: Request, res: Response) => {
  try {
    const groupId = req.query.groupId as string | undefined;
    const eventId = req.query.eventId as string | undefined;
    let sql = `
      SELECT t.id, t.group_id as "groupId", t.event_id as "eventId", t.title, t.quantity,
             t.assigned_to_id as "assignedToId",
             u.first_name as "assignedToName",
             u.avatar as "assignedToAvatar",
             t.completed, t.category,
             t.created_by as "createdBy",
             t.created_at as "createdAt"
      FROM logistics_tasks t
      LEFT JOIN users u ON t.assigned_to_id = u.id
    `;
    const params: any[] = [];
    if (groupId && eventId) {
      sql += ` WHERE t.group_id = $1 AND t.event_id = $2`;
      params.push(groupId, eventId);
    } else if (groupId) {
      sql += ` WHERE t.group_id = $1`;
      params.push(groupId);
    } else if (eventId) {
      sql += ` WHERE t.event_id = $1`;
      params.push(eventId);
    }
    sql += ` ORDER BY t.created_at ASC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error in GET /tasks:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/tasks', async (req: Request, res: Response) => {
  try {
    const {
      groupId,
      eventId = null,
      title,
      quantity = '1',
      assignedToId = null,
      category = 'Matériel',
      createdBy = 'user-me',
    } = req.body;

    const taskId = `task-${Date.now()}`;
    await query(
      `INSERT INTO logistics_tasks (id, group_id, event_id, title, quantity, assigned_to_id, completed, category, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, NOW())`,
      [taskId, groupId, eventId || null, title, quantity, assignedToId, category, createdBy]
    );

    let assignedToName = null;
    let assignedToAvatar = null;
    if (assignedToId) {
      const uRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [assignedToId]);
      if (uRes.rows.length > 0) {
        assignedToName = uRes.rows[0].first_name;
        assignedToAvatar = uRes.rows[0].avatar;
      }
    }

    const newTask = {
      id: taskId,
      groupId,
      eventId: eventId || null,
      title,
      quantity,
      assignedToId,
      assignedToName,
      assignedToAvatar,
      completed: false,
      category,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    realtimeBroadcaster.broadcast({
      type: 'task:created',
      groupId,
      data: newTask,
    });

    res.json(newTask);
  } catch (err: any) {
    console.error('Error in POST /tasks:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/tasks/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE logistics_tasks
       SET completed = NOT completed
       WHERE id = $1
       RETURNING id, group_id as "groupId", completed`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const row = result.rows[0];
    realtimeBroadcaster.broadcast({
      type: 'task:toggled',
      groupId: row.groupId,
      data: { id: row.id, groupId: row.groupId, completed: row.completed },
    });

    res.json(row);
  } catch (err: any) {
    console.error('Error in PUT /tasks/:id/toggle:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/tasks/:id/claim', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId = 'user-me' } = req.body;

    const tRes = await query(
      `UPDATE logistics_tasks
       SET assigned_to_id = $1
       WHERE id = $2
       RETURNING group_id as "groupId"`,
      [userId, id]
    );

    const uRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [userId]);
    const user = uRes.rows[0];
    const groupId = tRes.rows[0]?.groupId;

    const claimedData = {
      id,
      groupId,
      assignedToId: userId,
      assignedToName: user?.first_name || null,
      assignedToAvatar: user?.avatar || null,
    };

    realtimeBroadcaster.broadcast({
      type: 'task:claimed',
      groupId,
      data: claimedData,
    });

    res.json(claimedData);
  } catch (err: any) {
    console.error('Error in PUT /tasks/:id/claim:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/tasks/:id/unclaim', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tRes = await query(
      `UPDATE logistics_tasks
       SET assigned_to_id = NULL
       WHERE id = $1
       RETURNING group_id as "groupId"`,
      [id]
    );
    const groupId = tRes.rows[0]?.groupId;

    const unclaimedData = {
      id,
      groupId,
      assignedToId: null,
      assignedToName: null,
      assignedToAvatar: null,
    };

    realtimeBroadcaster.broadcast({
      type: 'task:unclaimed',
      groupId,
      data: unclaimedData,
    });

    res.json(unclaimedData);
  } catch (err: any) {
    console.error('Error in PUT /tasks/:id/unclaim:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT group_id as "groupId" FROM logistics_tasks WHERE id = $1`, [id]);
    const groupId = existing.rows[0]?.groupId;

    await query(`DELETE FROM logistics_tasks WHERE id = $1`, [id]);

    realtimeBroadcaster.broadcast({
      type: 'task:deleted',
      groupId,
      data: { id, groupId },
    });

    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error in DELETE /tasks/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. PARTAGE DES FRAIS (EXPENSES) & DETTES
// ==========================================

apiRouter.get('/expenses', async (req: Request, res: Response) => {
  try {
    const groupId = req.query.groupId as string | undefined;
    let sql = `
      SELECT e.id, e.group_id as "groupId", e.title, e.amount::float as amount,
             e.paid_by_id as "paidById",
             COALESCE(u.first_name, 'Membre') as "paidByName",
             COALESCE(u.avatar, '') as "paidByAvatar",
             e.category, e.date::text as date,
             e.split_mode as "splitMode",
             COALESCE(e.participant_ids, '[]'::jsonb) as "participantIds",
             COALESCE(e.shares_snapshot, '{}'::jsonb) as "sharesSnapshot",
             e.created_at as "createdAt"
      FROM expenses e
      LEFT JOIN users u ON e.paid_by_id = u.id
    `;
    const params: any[] = [];
    if (groupId) {
      sql += ` WHERE e.group_id = $1`;
      params.push(groupId);
    }
    sql += ` ORDER BY e.date DESC, e.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error in GET /expenses:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/expenses', async (req: Request, res: Response) => {
  try {
    const {
      groupId,
      title,
      amount,
      paidById = 'user-me',
      category = 'Autre',
      date = new Date().toISOString().split('T')[0],
      splitMode = 'all',
      participantIds = [],
      sharesSnapshot = {},
    } = req.body;

    const id = `exp-${Date.now()}`;
    await query(
      `INSERT INTO expenses (id, group_id, title, amount, paid_by_id, category, date, split_mode, participant_ids, shares_snapshot, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        id,
        groupId,
        title,
        amount,
        paidById,
        category,
        date,
        splitMode,
        JSON.stringify(participantIds),
        JSON.stringify(sharesSnapshot),
      ]
    );

    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [paidById]);
    const user = userRes.rows[0];

    const newExpense = {
      id,
      groupId,
      title,
      amount: Number(amount),
      paidById,
      paidByName: user?.first_name || 'Membre',
      paidByAvatar: user?.avatar || '',
      category,
      date,
      splitMode,
      participantIds,
      sharesSnapshot,
      createdAt: new Date().toISOString(),
    };

    realtimeBroadcaster.broadcast({
      type: 'expense:created',
      groupId,
      data: newExpense,
    });

    res.json(newExpense);
  } catch (err: any) {
    console.error('Error in POST /expenses:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT group_id as "groupId" FROM expenses WHERE id = $1`, [id]);
    const groupId = existing.rows[0]?.groupId;

    await query(`DELETE FROM expenses WHERE id = $1`, [id]);

    realtimeBroadcaster.broadcast({
      type: 'expense:deleted',
      groupId,
      data: { id, groupId },
    });

    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error in DELETE /expenses/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Gestion des règlements de dettes (Debt Settlements & Remboursements)
apiRouter.get('/settlements', async (req: Request, res: Response) => {
  try {
    const groupId = req.query.groupId as string | undefined;
    let sql = `
      SELECT s.id, s.group_id as "groupId", s.from_user_id as "fromUserId", s.to_user_id as "toUserId",
             s.amount::float as amount, s.status, s.settled_at as "settledAt",
             s.created_at as "createdAt", s.updated_at as "updatedAt",
             COALESCE(u1.first_name, 'Membre') as "fromUserFirstName",
             COALESCE(u1.last_name, '') as "fromUserLastName",
             COALESCE(NULLIF(TRIM(concat(u1.first_name, ' ', u1.last_name)), ''), u1.first_name, 'Membre') as "fromUserName",
             COALESCE(u1.avatar, '') as "fromUserAvatar",
             COALESCE(u2.first_name, 'Membre') as "toUserFirstName",
             COALESCE(u2.last_name, '') as "toUserLastName",
             COALESCE(NULLIF(TRIM(concat(u2.first_name, ' ', u2.last_name)), ''), u2.first_name, 'Membre') as "toUserName",
             COALESCE(u2.avatar, '') as "toUserAvatar"
      FROM debt_settlements s
      LEFT JOIN users u1 ON s.from_user_id = u1.id
      LEFT JOIN users u2 ON s.to_user_id = u2.id
    `;
    const params: any[] = [];
    if (groupId) {
      sql += ` WHERE s.group_id = $1`;
      params.push(groupId);
    }
    sql += ` ORDER BY COALESCE(s.settled_at, s.updated_at, s.created_at) DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error in GET /settlements:', err);
    res.status(500).json({ error: err.message });
  }
});

const handleSettlementToggle = async (req: Request, res: Response) => {
  try {
    const {
      id,
      groupId,
      fromUserId,
      toUserId,
      amount,
      status = 'settled',
    } = req.body;

    if (!fromUserId || !toUserId) {
      return res.status(400).json({ error: 'fromUserId and toUserId are required' });
    }

    const cleanGroupId = groupId || 'group-current';
    const settlementId = id || `settle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newStatus = status;
    const settledAt = newStatus === 'settled' ? new Date().toISOString() : null;

    await query(
      `INSERT INTO debt_settlements (id, group_id, from_user_id, to_user_id, amount, status, settled_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         settled_at = EXCLUDED.settled_at,
         amount = EXCLUDED.amount,
         updated_at = NOW()`,
      [settlementId, cleanGroupId, fromUserId, toUserId, amount, newStatus, settledAt]
    );

    const fullResult = await query(
      `SELECT s.id, s.group_id as "groupId", s.from_user_id as "fromUserId", s.to_user_id as "toUserId",
              s.amount::float as amount, s.status, s.settled_at as "settledAt",
              s.created_at as "createdAt", s.updated_at as "updatedAt",
              COALESCE(u1.first_name, 'Membre') as "fromUserFirstName",
              COALESCE(u1.last_name, '') as "fromUserLastName",
              COALESCE(NULLIF(TRIM(concat(u1.first_name, ' ', u1.last_name)), ''), u1.first_name, 'Membre') as "fromUserName",
              COALESCE(u1.avatar, '') as "fromUserAvatar",
              COALESCE(u2.first_name, 'Membre') as "toUserFirstName",
              COALESCE(u2.last_name, '') as "toUserLastName",
              COALESCE(NULLIF(TRIM(concat(u2.first_name, ' ', u2.last_name)), ''), u2.first_name, 'Membre') as "toUserName",
              COALESCE(u2.avatar, '') as "toUserAvatar"
       FROM debt_settlements s
       LEFT JOIN users u1 ON s.from_user_id = u1.id
       LEFT JOIN users u2 ON s.to_user_id = u2.id
       WHERE s.id = $1`,
      [settlementId]
    );

    const settlement = fullResult.rows[0];

    realtimeBroadcaster.broadcast({
      type: 'settlement:updated',
      groupId: cleanGroupId,
      data: settlement,
    });

    res.json(settlement);
  } catch (err: any) {
    console.error('Error in POST /settlements/toggle:', err);
    res.status(500).json({ error: err.message });
  }
};

apiRouter.post('/settlements/toggle', handleSettlementToggle);
apiRouter.post('/settlements/settle', handleSettlementToggle);
apiRouter.post('/settlements', handleSettlementToggle);

// ==========================================
// 11. NOTIFICATIONS & ENVOI D'EMAILS RESEND
// ==========================================

apiRouter.get('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'user-me';
    const result = await query(
      `SELECT id, user_id as "userId", type, title, message, timestamp, read,
              group_id as "groupId", event_id as "eventId"
       FROM notifications
       WHERE user_id = $1
       ORDER BY timestamp DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error in GET /notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    const userId = (req.body.userId as string) || 'user-me';
    await query(`UPDATE notifications SET read = true WHERE user_id = $1`, [userId]);

    realtimeBroadcaster.broadcast({
      type: 'notification:read_all',
      userId,
      data: { userId },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error in PUT /notifications/read-all:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notifRes = await query(`UPDATE notifications SET read = true WHERE id = $1 RETURNING user_id as "userId"`, [id]);
    const userId = notifRes.rows[0]?.userId;

    realtimeBroadcaster.broadcast({
      type: 'notification:read',
      userId,
      data: { id, userId },
    });

    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error in PUT /notifications/:id/read:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/notifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notifRes = await query(`DELETE FROM notifications WHERE id = $1 RETURNING user_id as "userId"`, [id]);
    const userId = notifRes.rows[0]?.userId;

    realtimeBroadcaster.broadcast({
      type: 'notification:dismissed',
      userId,
      data: { id, userId },
    });

    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error in DELETE /notifications/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// Envoi d'email d'invitation (Resend - support unitaire et batch)
apiRouter.post('/invitations/send-email', async (req: Request, res: Response) => {
  try {
    const { emails, toEmail, senderName, groupName, inviteLink, groupId, senderId = 'user-me' } = req.body;
    const rawEmails: string[] = Array.isArray(emails)
      ? emails
      : (typeof toEmail === 'string' && toEmail ? [toEmail] : []);

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleaned = rawEmails
      .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
      .filter((e) => EMAIL_REGEX.test(e));
    const uniqueEmails = [...new Set(cleaned)];

    if (uniqueEmails.length === 0) {
      return res.status(400).json({ error: 'Veuillez renseigner au moins une adresse e-mail valide' });
    }

    const fallbackBaseUrl = getCleanAppUrl();
    const baseLink = inviteLink || (groupId ? `${fallbackBaseUrl}/join/${groupId}` : fallbackBaseUrl);

    const emailBatchPayload = [];
    const createdInvitations = [];

    for (const email of uniqueEmails) {
      const invId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const token = crypto.randomUUID();

      try {
        await query(
          `INSERT INTO invitations (id, token, email, group_id, inviter_id, type, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())`,
          [invId, token, email, groupId || null, senderId, groupId ? 'group' : 'friend']
        );
      } catch (dbErr) {
        console.warn('Could not insert invitation in DB:', dbErr);
      }

      const separator = baseLink.includes('?') ? '&' : '?';
      const personalLink = `${baseLink}${separator}token=${token}`;

      emailBatchPayload.push({
        toEmail: email,
        senderName: senderName || 'Un ami',
        groupName,
        inviteLink: personalLink,
        token,
      });

      createdInvitations.push({ id: invId, token, email, inviteLink: personalLink });
    }

    // Envoi individuel à chaque destinataire
    const sendResult = await emailService.sendBatchInvitations(emailBatchPayload);

    res.json({
      success: sendResult.success,
      count: uniqueEmails.length,
      results: sendResult.results,
      invitations: createdInvitations,
    });
  } catch (err: any) {
    console.error('Error sending invitation emails:', err);
    res.status(500).json({ error: err.message });
  }
});

// Consultation d'une invitation par token
apiRouter.get('/invitations/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const invRes = await query(
      `SELECT i.id, i.token, i.email, i.group_id as "groupId", i.inviter_id as "inviterId",
              i.type, i.status, i.created_at as "createdAt",
              g.name as "groupName", g.description as "groupDescription", g.cover_image as "groupCoverImage",
              u.first_name as "inviterFirstName", u.last_name as "inviterLastName", u.avatar as "inviterAvatar"
       FROM invitations i
       LEFT JOIN groups g ON i.group_id = g.id
       LEFT JOIN users u ON i.inviter_id = u.id
       WHERE i.token = $1`,
      [token]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation introuvable ou expirée' });
    }

    res.json(invRes.rows[0]);
  } catch (err: any) {
    console.error('Error in GET /invitations/:token:', err);
    res.status(500).json({ error: err.message });
  }
});

// Acceptation d'une invitation par token
apiRouter.post('/invitations/:token/accept', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { userId = 'user-me' } = req.body;

    const invRes = await query(
      `SELECT id, token, email, group_id as "groupId", inviter_id as "inviterId", type, status
       FROM invitations
       WHERE token = $1`,
      [token]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation introuvable' });
    }

    const invitation = invRes.rows[0];

    // Si c'est une invitation à un groupe, ajouter l'utilisateur
    if (invitation.groupId) {
      await query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'member', NOW())
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [invitation.groupId, userId]
      );
    }

    // Si c'est une invitation ami, créer les relations
    if (invitation.type === 'friend' && invitation.inviterId && invitation.inviterId !== userId) {
      await query(
        `INSERT INTO friends (user_id, friend_id, status)
         VALUES ($1, $2, 'accepted')
         ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'`,
        [invitation.inviterId, userId]
      );
      await query(
        `INSERT INTO friends (user_id, friend_id, status)
         VALUES ($1, $2, 'accepted')
         ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'`,
        [userId, invitation.inviterId]
      );
    }

    // Marquer l'invitation comme acceptée
    await query(`UPDATE invitations SET status = 'accepted' WHERE token = $1`, [token]);

    res.json({
      success: true,
      invitation,
      userId,
    });
  } catch (err: any) {
    console.error('Error in POST /invitations/:token/accept:', err);
    res.status(500).json({ error: err.message });
  }
});

// Envoi d'email de rappel d'événement (Resend)
apiRouter.post('/reminders/send-email', async (req: Request, res: Response) => {
  try {
    const { toEmail, eventTitle, startDateTime, location, gpsUrl } = req.body;
    if (!toEmail || !eventTitle || !startDateTime) {
      return res.status(400).json({ error: 'toEmail, eventTitle and startDateTime are required' });
    }
    const result = await emailService.sendEventReminder({
      toEmail,
      eventTitle,
      startDateTime,
      location,
      gpsUrl,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Error sending reminder email:', err);
    res.status(500).json({ error: err.message });
  }
});
