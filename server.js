// server/index.ts
import express2 from "express";
import path from "path";
import { fileURLToPath } from "url";

// server/app.ts
import express from "express";
import dotenv3 from "dotenv";

// server/api.ts
import { Router } from "express";

// server/db.ts
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
var { Pool } = pg;
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("\u26A0\uFE0F Attention : DATABASE_URL non d\xE9finie dans l'environnement.");
}
var pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 3e4
});
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});
var query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
};

// server/resend.ts
import { Resend } from "resend";
import dotenv2 from "dotenv";
dotenv2.config();
var apiKey = process.env.RESEND_API_KEY;
var isConfigured = apiKey && apiKey.startsWith("re_") && !apiKey.includes("123456789") && !apiKey.includes("your_resend");
var resend = isConfigured ? new Resend(apiKey) : null;
var emailService = {
  /**
   * Envoi d'un e-mail d'invitation à un groupe ou en ami
   */
  async sendInvitation({ toEmail, senderName, groupName, inviteLink }) {
    const subject = groupName ? `Invitation : Rejoignez le groupe "${groupName}" sur Outly` : `Demande d'ami de ${senderName} sur Outly`;
    const appBaseUrl = process.env.APP_URL || "http://localhost:3000";
    const finalInviteLink = inviteLink || appBaseUrl;
    const htmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif, Arial; background-color: #FFF9EB; color: #27272A; padding: 24px; border-radius: 16px; max-width: 550px; margin: auto; border: 1px solid #C7B7A3;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #6D2932; font-family: Georgia, serif; font-size: 28px; margin: 0;">Outly</h1>
        </div>
        <div style="background-color: #E8D8C4; padding: 20px; border-radius: 12px; border: 1px solid #C7B7A3;">
          <h2 style="color: #6D2932; font-size: 18px; margin-top: 0;">${senderName} vous invite !</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #27272A;">
            ${groupName ? `Vous avez \xE9t\xE9 invit\xE9(e) \xE0 rejoindre le groupe d'escapades <strong>${groupName}</strong>.` : `${senderName} souhaite se connecter avec vous sur Outly.`}
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${finalInviteLink}" style="display: inline-block; background-color: #6D2932; color: #FFF9EB; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: bold; font-size: 14px;">
              ${groupName ? "Rejoindre le groupe" : "Accepter l'invitation"}
            </a>
          </div>
        </div>
        <p style="text-align: center; font-size: 11px; color: #71717A; margin-top: 16px;">
          Cet e-mail a \xE9t\xE9 envoy\xE9 automatiquement par Outly.
        </p>
      </div>
    `;
    if (!resend) {
      console.log(`[Resend SIMULATION] Email d'invitation simul\xE9 envoy\xE9 \xE0 ${toEmail} pour "${groupName || "Amis"}" de la part de ${senderName}`);
      return { success: true, simulated: true, id: `sim-${Date.now()}` };
    }
    try {
      const data = await resend.emails.send({
        from: "Outly <notifications@resend.dev>",
        to: toEmail,
        subject,
        html: htmlContent
      });
      return { success: true, data };
    } catch (error) {
      console.error("Erreur lors de l'envoi via Resend:", error);
      return { success: false, error: error.message };
    }
  },
  /**
   * Envoi d'un rappel 24 h avant un événement
   */
  async sendEventReminder({ toEmail, eventTitle, startDateTime, location, gpsUrl }) {
    const formattedDate = new Date(startDateTime).toLocaleString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    });
    const subject = `Rappel Outly : "${eventTitle}" a lieu demain !`;
    const htmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif, Arial; background-color: #FFF9EB; color: #27272A; padding: 24px; border-radius: 16px; max-width: 550px; margin: auto; border: 1px solid #C7B7A3;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #6D2932; font-family: Georgia, serif; font-size: 28px; margin: 0;">Outly</h1>
          <p style="color: #6D2932; font-size: 14px; margin-top: 4px;">Rappel d'\xE9v\xE9nement</p>
        </div>
        <div style="background-color: #E8D8C4; padding: 20px; border-radius: 12px; border: 1px solid #C7B7A3;">
          <h2 style="color: #6D2932; font-size: 18px; margin-top: 0;">C'est demain !</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #27272A;">
            Votre sortie <strong>"${eventTitle}"</strong> d\xE9bute le <strong>${formattedDate}</strong>.
          </p>
          ${location ? `<p style="font-size: 13px; color: #27272A;"><strong>Lieu :</strong> ${location}</p>` : ""}
          ${gpsUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <a href="${gpsUrl}" style="display: inline-block; background-color: #6D2932; color: #FFF9EB; text-decoration: none; padding: 10px 20px; border-radius: 9999px; font-weight: bold; font-size: 13px;">
                Voir l'itin\xE9raire GPS
              </a>
            </div>
          ` : ""}
        </div>
        <p style="text-align: center; font-size: 11px; color: #71717A; margin-top: 16px;">
          N'oubliez pas vos \xE9quipements et pr\xE9venez le groupe en cas d'impr\xE9vu.
        </p>
      </div>
    `;
    if (!resend) {
      console.log(`[Resend SIMULATION] Rappel d'\xE9v\xE9nement envoy\xE9 \xE0 ${toEmail} pour "${eventTitle}" pr\xE9vu le ${formattedDate}`);
      return { success: true, simulated: true, id: `sim-${Date.now()}` };
    }
    try {
      const data = await resend.emails.send({
        from: "Outly <notifications@resend.dev>",
        to: toEmail,
        subject,
        html: htmlContent
      });
      return { success: true, data };
    } catch (error) {
      console.error("Erreur lors de l'envoi du rappel Resend:", error);
      return { success: false, error: error.message };
    }
  }
};

// server/api.ts
var apiRouter = Router();
(async () => {
  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;`);
    await query(`ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS end_date_value TEXT;`);
  } catch (e) {
    console.error("Migration error (can be ignored if table locked):", e);
  }
})();
apiRouter.get("/users", async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"
       FROM users
       ORDER BY first_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /users:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/auth/check-handle", async (req, res) => {
  try {
    const handle = req.query.handle || "";
    if (!handle.trim()) {
      return res.json({ available: true });
    }
    const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
    const existing = await query(`SELECT id FROM users WHERE handle ILIKE $1`, [cleanHandle]);
    res.json({ available: existing.rows.length === 0 });
  } catch (err) {
    console.error("Error in GET /auth/check-handle:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/auth/register", async (req, res) => {
  try {
    const { firstName, lastName = "", email, handle, password, avatar } = req.body;
    if (!email || !firstName) {
      return res.status(400).json({ error: "Pr\xE9nom et e-mail sont obligatoires" });
    }
    if (!handle || !handle.trim()) {
      return res.status(400).json({ error: "Le pseudo est obligatoire" });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: "Le mot de passe doit comporter au moins 4 caract\xE8res" });
    }
    const cleanHandle = handle.startsWith("@") ? handle.trim() : `@${handle.trim()}`;
    const handleExists = await query(`SELECT id FROM users WHERE handle ILIKE $1`, [cleanHandle]);
    if (handleExists.rows.length > 0) {
      return res.status(400).json({ error: "Ce pseudo est d\xE9j\xE0 utilis\xE9, veuillez en choisir un autre." });
    }
    const emailExists = await query(`SELECT id FROM users WHERE email ILIKE $1`, [email.trim()]);
    if (emailExists.rows.length > 0) {
      return res.status(400).json({ error: "Un compte avec cet e-mail existe d\xE9j\xE0" });
    }
    const userId = `user-${Date.now()}`;
    const userAvatar = avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
    const insertRes = await query(
      `INSERT INTO users (id, first_name, last_name, email, handle, avatar, shares, theme_preference, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 'light', $7)
       RETURNING id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"`,
      [userId, firstName, lastName, email, cleanHandle, userAvatar, password]
    );
    res.json(insertRes.rows[0]);
  } catch (err) {
    console.error("Error in POST /auth/register:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/auth/login", async (req, res) => {
  try {
    const { emailOrHandle, password } = req.body;
    if (!emailOrHandle || !emailOrHandle.trim()) {
      return res.status(400).json({ error: "Veuillez saisir votre e-mail ou pseudo" });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: "Veuillez saisir votre mot de passe" });
    }
    const result = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference", password_hash
       FROM users
       WHERE email ILIKE $1 OR handle ILIKE $1
       LIMIT 1`,
      [emailOrHandle.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Compte introuvable avec cet identifiant" });
    }
    const user = result.rows[0];
    if (!user.password_hash || user.password_hash !== password.trim()) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }
    const { password_hash, ...profile } = user;
    res.json(profile);
  } catch (err) {
    console.error("Error in POST /auth/login:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/auth/google", async (req, res) => {
  try {
    const { email, firstName, lastName, avatar, googleId } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email Google manquant" });
    }
    const existing = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"
       FROM users
       WHERE (google_id IS NOT NULL AND google_id = $1) OR email ILIKE $2
       LIMIT 1`,
      [googleId || "", email]
    );
    if (existing.rows.length > 0) {
      if (googleId) {
        await query(`UPDATE users SET google_id = $1 WHERE id = $2 AND (google_id IS NULL OR google_id = '')`, [googleId, existing.rows[0].id]);
      }
      return res.json(existing.rows[0]);
    }
    const userId = `user-google-${googleId || Date.now()}`;
    const handle = `@${email.split("@")[0]}`;
    const userAvatar = avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
    const insertRes = await query(
      `INSERT INTO users (id, first_name, last_name, email, handle, avatar, shares, theme_preference, password_hash, google_id)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 'light', 'google_oauth', $7)
       RETURNING id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"`,
      [userId, firstName || "Utilisateur", lastName || "", email, handle, userAvatar, googleId || userId]
    );
    res.json(insertRes.rows[0]);
  } catch (err) {
    console.error("Error in POST /auth/google:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/users/:id/password", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 4 caract\xE8res" });
    }
    const userRes = await query(`SELECT password_hash FROM users WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    const user = userRes.rows[0];
    if (user.password_hash && user.password_hash !== "default" && currentPassword && user.password_hash !== currentPassword) {
      return res.status(401).json({ error: "Ancien mot de passe incorrect" });
    }
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newPassword, id]);
    res.json({ success: true, message: "Mot de passe mis \xE0 jour avec succ\xE8s" });
  } catch (err) {
    console.error("Error in POST /users/:id/password:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/user/me", async (req, res) => {
  try {
    const userId = req.query.userId || "user-me";
    const result = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"
       FROM users
       WHERE id = $1`,
      [userId]
    );
    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }
    const fallback = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", email, handle, avatar, shares, theme_preference as "themePreference"
       FROM users
       LIMIT 1`
    );
    if (fallback.rows.length > 0) {
      return res.json(fallback.rows[0]);
    }
    return res.status(404).json({ error: "User not found" });
  } catch (err) {
    console.error("Error in GET /user/me:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/users/:id", async (req, res) => {
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
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in PUT /users/:id:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
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
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    res.json({ success: true, userId: id });
  } catch (err) {
    console.error("Error in DELETE /users/:id:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/friends", async (req, res) => {
  try {
    const userId = req.query.userId || "user-me";
    const result = await query(
      `SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.handle, u.email, u.avatar, u.shares, f.status
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1
       ORDER BY u.first_name ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /friends:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/friends", async (req, res) => {
  try {
    const { userId = "user-me", handleOrEmail } = req.body;
    if (!handleOrEmail || !handleOrEmail.trim()) {
      return res.status(400).json({ error: "Veuillez saisir un @pseudo ou une adresse e-mail" });
    }
    const trimmed = handleOrEmail.trim();
    const cleanHandle = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    const targetUserRes = await query(
      `SELECT id, first_name as "firstName", last_name as "lastName", handle, email, avatar, shares
       FROM users
       WHERE handle ILIKE $1 OR handle ILIKE $2 OR email ILIKE $2
       LIMIT 1`,
      [cleanHandle, trimmed]
    );
    const targetUser = targetUserRes.rows[0];
    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    if (targetUser.id === userId) {
      return res.status(400).json({ error: "Vous ne pouvez pas vous ajouter vous-m\xEAme en ami" });
    }
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
    const senderRes = await query(`SELECT first_name, last_name, handle FROM users WHERE id = $1`, [userId]);
    const sender = senderRes.rows[0] || { first_name: "Un ami", handle: "@ami" };
    const senderName = sender.first_name || "Un membre";
    const notifId = `notif-${Date.now()}`;
    const notifMessage = `${senderName} (${sender.handle || "@pseudo"}) vous a envoy\xE9 une demande d'ami.`;
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, timestamp, read)
       VALUES ($1, $2, 'invite', 'Nouvelle demande d''ami', $3, NOW(), false)`,
      [notifId, targetUser.id, notifMessage]
    );
    if (targetUser.email && !targetUser.email.endsWith("@outly.app")) {
      emailService.sendInvitation({
        toEmail: targetUser.email,
        senderName: `${sender.first_name} ${sender.last_name || ""}`.trim()
      }).catch((e) => console.error("Background Resend email invite failed:", e));
    }
    res.json({
      ...targetUser,
      status: "pending_sent"
    });
  } catch (err) {
    console.error("Error in POST /friends:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/friends/:friendId", async (req, res) => {
  try {
    const userId = req.body.userId || "user-me";
    const { friendId } = req.params;
    const { status = "accepted" } = req.body;
    await query(
      `UPDATE friends
       SET status = $1
       WHERE (user_id = $2 AND friend_id = $3) OR (user_id = $3 AND friend_id = $2)`,
      [status, userId, friendId]
    );
    if (status === "accepted") {
      const accepterRes = await query(`SELECT first_name FROM users WHERE id = $1`, [userId]);
      const accepterName = accepterRes.rows[0]?.first_name || "Un ami";
      const notifMsg = `${accepterName} a accept\xE9 votre demande d'ami.`;
      const existingNotif = await query(
        `SELECT id FROM notifications WHERE user_id = $1 AND type = 'friend' AND message = $2`,
        [friendId, notifMsg]
      );
      if (existingNotif.rows.length === 0) {
        const notifId = `notif-${Date.now()}`;
        await query(
          `INSERT INTO notifications (id, user_id, type, title, message, timestamp, read)
           VALUES ($1, $2, 'friend', 'Demande d''ami accept\xE9e', $3, NOW(), false)`,
          [notifId, friendId, notifMsg]
        );
      }
    }
    res.json({ success: true, friendId, status });
  } catch (err) {
    console.error("Error in PUT /friends/:friendId:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/friends/:friendId", async (req, res) => {
  try {
    const userId = req.query.userId || "user-me";
    const { friendId } = req.params;
    await query(
      `DELETE FROM friends
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );
    res.json({ success: true, friendId });
  } catch (err) {
    console.error("Error in DELETE /friends/:friendId:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/groups", async (req, res) => {
  try {
    const userId = req.query.userId;
    let groupsSql = `
      SELECT g.id, g.name, g.description, g.cover_image as "coverImage", g.created_at as "createdAt"
      FROM groups g
    `;
    const params = [];
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
    const membersByGroup = {};
    for (const m of membersRes.rows) {
      if (!membersByGroup[m.groupId]) {
        membersByGroup[m.groupId] = [];
      }
      membersByGroup[m.groupId].push({
        id: m.id,
        userId: m.userId,
        firstName: m.firstName,
        lastName: m.lastName,
        name: m.name.trim(),
        handle: m.handle,
        avatar: m.avatar,
        shares: m.shares,
        role: m.role
      });
    }
    const fullGroups = groupsRes.rows.map((g) => ({
      ...g,
      members: membersByGroup[g.id] || []
    }));
    res.json(fullGroups);
  } catch (err) {
    console.error("Error in GET /groups:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/groups", async (req, res) => {
  try {
    const { name, description, coverImage, creatorId = "user-me", invitedFriendIds = [] } = req.body;
    const groupId = `group-${Date.now()}`;
    await query(
      `INSERT INTO groups (id, name, description, cover_image, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        groupId,
        name || "Nouveau Groupe",
        description || "",
        coverImage || "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1000&auto=format&fit=crop&q=80"
      ]
    );
    await query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [groupId, creatorId]
    );
    for (const fId of invitedFriendIds) {
      await query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'member', NOW())
         ON CONFLICT DO NOTHING`,
        [groupId, fId]
      );
    }
    const membersRes = await query(
      `SELECT u.id, u.id as "userId", u.first_name as "firstName", u.last_name as "lastName",
              concat(u.first_name, ' ', u.last_name) as name, u.handle, u.avatar, u.shares, gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1`,
      [groupId]
    );
    res.json({
      id: groupId,
      name,
      description,
      coverImage,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      members: membersRes.rows
    });
  } catch (err) {
    console.error("Error in POST /groups:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/groups/:id/members", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = "member" } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    await query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (group_id, user_id) DO NOTHING`,
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
    res.json(memberRes.rows[0] || { success: true, groupId: id, userId });
  } catch (err) {
    console.error("Error in POST /groups/:id/members:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/groups/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM groups WHERE id = $1`, [id]);
    res.json({ success: true, groupId: id });
  } catch (err) {
    console.error("Error in DELETE /groups/:id:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/groups/:id/members/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;
    const memberRoleRes = await query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [id, userId]
    );
    const wasAdmin = memberRoleRes.rows[0]?.role === "admin";
    await query(`DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`, [id, userId]);
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
    res.json({ success: true, groupId: id, userId });
  } catch (err) {
    console.error("Error in DELETE /groups/:id/members/:userId:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/events", async (req, res) => {
  try {
    const groupId = req.query.groupId;
    const userId = req.query.userId;
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
    const params = [];
    if (groupId) {
      sql += ` WHERE e.group_id = $1`;
      params.push(groupId);
    } else if (userId) {
      sql += ` WHERE e.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)`;
      params.push(userId);
    }
    sql += ` ORDER BY e.start_datetime ASC`;
    const eventsRes = await query(sql, params);
    const rsvpRes = await query(`SELECT event_id as "eventId", user_id as "userId", status FROM event_rsvps`);
    const rsvpByEvent = {};
    for (const r of rsvpRes.rows) {
      if (!rsvpByEvent[r.eventId]) {
        rsvpByEvent[r.eventId] = {};
      }
      rsvpByEvent[r.eventId][r.userId] = r.status;
    }
    const fullEvents = eventsRes.rows.map((ev) => ({
      ...ev,
      rsvp: rsvpByEvent[ev.id] || {}
    }));
    res.json(fullEvents);
  } catch (err) {
    console.error("Error in GET /events:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/events", async (req, res) => {
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
      organizerId = "user-me",
      reminder24h = true,
      rsvp = {}
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
        location || "",
        gpsUrl || null,
        description || "",
        bannerImage || null,
        organizerId,
        reminder24h
      ]
    );
    const initialRsvp = {
      [organizerId]: "going",
      ...rsvp
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
    const org = userRes.rows[0] || { first_name: "Organisateur", avatar: "" };
    res.json({
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
      rsvp: initialRsvp
    });
  } catch (err) {
    console.error("Error in POST /events:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/events/:id", async (req, res) => {
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
      reminder24h
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
        id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    const ev = result.rows[0];
    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [ev.organizer_id]);
    const org = userRes.rows[0] || { first_name: "Organisateur", avatar: "" };
    const rsvpRes = await query(`SELECT user_id as "userId", status FROM event_rsvps WHERE event_id = $1`, [id]);
    const rsvp = {};
    for (const r of rsvpRes.rows) {
      rsvp[r.userId] = r.status;
    }
    res.json({
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
      rsvp
    });
  } catch (err) {
    console.error("Error in PUT /events/:id:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM events WHERE id = $1`, [id]);
    res.json({ success: true, eventId: id });
  } catch (err) {
    console.error("Error in DELETE /events/:id:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/events/:id/rsvp", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId = "user-me", status } = req.body;
    await query(
      `INSERT INTO event_rsvps (event_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET status = EXCLUDED.status`,
      [id, userId, status]
    );
    res.json({ success: true, eventId: id, userId, status });
  } catch (err) {
    console.error("Error in PUT /events/:id/rsvp:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/availability", async (req, res) => {
  try {
    const { groupId, date } = req.query;
    if (!groupId) {
      return res.status(400).json({ error: "groupId is required" });
    }
    const targetDateStr = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const tzOffsetMinutes = req.query.tz ? Number(req.query.tz) : 0;
    const membersRes = await query(
      `SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.avatar
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY u.first_name ASC`,
      [groupId]
    );
    const eventsRes = await query(
      `SELECT e.id, e.start_datetime as "startDateTime", e.end_datetime as "endDateTime", r.user_id as "userId"
       FROM event_rsvps r
       JOIN events e ON r.event_id = e.id
       WHERE r.status = 'going'
         AND (e.start_datetime::date = $1::date OR (e.end_datetime IS NOT NULL AND e.end_datetime::date >= $1::date AND e.start_datetime::date <= $1::date))`,
      [targetDateStr]
    );
    const timeSlots = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
    const [selYear, selMonth, selDay] = targetDateStr.split("-").map(Number);
    const availability = membersRes.rows.map((member) => {
      const memberEvents = eventsRes.rows.filter((ev) => ev.userId === member.id);
      const slots = timeSlots.map((slot) => {
        const [hour] = slot.split(":").map(Number);
        const slotStartMs = Date.UTC(selYear, selMonth - 1, selDay, hour, 0, 0) + tzOffsetMinutes * 60 * 1e3;
        const slotEndMs = slotStartMs + 36e5;
        const isBusy = memberEvents.some((ev) => {
          const start = new Date(ev.startDateTime).getTime();
          const end = ev.endDateTime ? new Date(ev.endDateTime).getTime() : start + 36e5;
          return start < slotEndMs && end > slotStartMs;
        });
        return {
          time: slot,
          status: isBusy ? "busy" : "free",
          label: isBusy ? "Occup\xE9(e)" : "Libre"
        };
      });
      return {
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`.trim(),
        memberAvatar: member.avatar,
        slots
      };
    });
    res.json({
      date: targetDateStr,
      timeSlots,
      members: availability
    });
  } catch (err) {
    console.error("Error in GET /availability:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/messages", async (req, res) => {
  try {
    const groupId = req.query.groupId;
    let sql = `
      SELECT m.id, m.group_id as "groupId", m.sender_id as "senderId",
             CASE
               WHEN m.is_system THEN 'Outly Bot'
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
    const params = [];
    if (groupId) {
      sql += ` WHERE m.group_id = $1`;
      params.push(groupId);
    }
    sql += ` ORDER BY m.timestamp ASC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /messages:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/messages", async (req, res) => {
  try {
    const {
      id = `msg-${Date.now()}`,
      groupId,
      senderId = "user-me",
      text = "",
      imageUrl = null,
      isSystem = false,
      systemType = null,
      readBy = ["user-me"],
      reactions = [],
      timestamp = (/* @__PURE__ */ new Date()).toISOString()
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
        JSON.stringify(reactions)
      ]
    );
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
          [galId, groupId, imageUrl, senderId, text || "Photo partag\xE9e dans le fil", timestamp]
        );
      }
    }
    const userRes = await query(`SELECT first_name, last_name, avatar FROM users WHERE id = $1`, [senderId]);
    const user = userRes.rows[0];
    const senderName = isSystem ? "Outly Bot" : user ? `${user.first_name} ${user.last_name}`.trim() : "Membre";
    const senderAvatar = isSystem ? "" : user?.avatar || "";
    res.json({
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
      reactions
    });
  } catch (err) {
    console.error("Error in POST /messages:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/messages/:id/react", async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji, userId = "user-me" } = req.body;
    if (!emoji) {
      return res.status(400).json({ error: "Emoji is required" });
    }
    const msgRes = await query(`SELECT reactions FROM chat_messages WHERE id = $1`, [id]);
    if (msgRes.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }
    let reactions = msgRes.rows[0].reactions || [];
    const existingEmojiGroup = reactions.find((r) => r.emoji === emoji);
    if (existingEmojiGroup) {
      if (existingEmojiGroup.users.includes(userId)) {
        existingEmojiGroup.users = existingEmojiGroup.users.filter((u) => u !== userId);
      } else {
        existingEmojiGroup.users.push(userId);
      }
    } else {
      reactions.push({
        emoji,
        users: [userId]
      });
    }
    reactions = reactions.filter((r) => r.users.length > 0);
    await query(
      `UPDATE chat_messages SET reactions = $1 WHERE id = $2`,
      [JSON.stringify(reactions), id]
    );
    res.json({ success: true, messageId: id, reactions });
  } catch (err) {
    console.error("Error in POST /messages/:id/react:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/polls", async (req, res) => {
  try {
    const groupId = req.query.groupId;
    let sql = `
      SELECT p.id, p.group_id as "groupId", p.title, p.type, p.description,
             p.created_by as "createdBy",
             COALESCE(u.first_name, 'Membre') as "creatorName",
             COALESCE(u.avatar, '') as "creatorAvatar",
             p.created_at as "createdAt"
      FROM polls p
      LEFT JOIN users u ON p.created_by = u.id
    `;
    const params = [];
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
    const optionsByPoll = {};
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
        votes: opt.votes
      });
    }
    const fullPolls = pollsRes.rows.map((p) => ({
      ...p,
      options: optionsByPoll[p.id] || []
    }));
    res.json(fullPolls);
  } catch (err) {
    console.error("Error in GET /polls:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/polls", async (req, res) => {
  try {
    const { groupId, title, type, description, createdBy = "user-me", options = [] } = req.body;
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
        votes: opt.votes || []
      });
    }
    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [createdBy]);
    const user = userRes.rows[0];
    res.json({
      id: pollId,
      groupId,
      title,
      type,
      description,
      createdBy,
      creatorName: user?.first_name || "Membre",
      creatorAvatar: user?.avatar || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      options: createdOptions
    });
  } catch (err) {
    console.error("Error in POST /polls:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/polls/:pollId/vote", async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionId, userId = "user-me", status = "available" } = req.body;
    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [userId]);
    const user = userRes.rows[0] || { first_name: "Utilisateur", avatar: "" };
    const optRes = await query(`SELECT id, votes FROM poll_options WHERE id = $1 AND poll_id = $2`, [optionId, pollId]);
    if (optRes.rows.length === 0) {
      return res.status(404).json({ error: "Option not found" });
    }
    const currentVotes = optRes.rows[0].votes || [];
    const otherVotes = currentVotes.filter((v) => v.userId !== userId);
    const updatedVotes = [
      ...otherVotes,
      {
        userId,
        userName: user.first_name,
        userAvatar: user.avatar,
        status
      }
    ];
    await query(`UPDATE poll_options SET votes = $1 WHERE id = $2`, [JSON.stringify(updatedVotes), optionId]);
    res.json({ success: true, pollId, optionId, votes: updatedVotes });
  } catch (err) {
    console.error("Error in POST /polls/:pollId/vote:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/polls/:id", async (req, res) => {
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
      return res.status(404).json({ error: "Sondage introuvable" });
    }
    const poll = pollRes.rows[0];
    if (options && options.length > 0) {
      const existingOptsRes = await query(`SELECT id, votes FROM poll_options WHERE poll_id = $1`, [id]);
      const existingVotesMap = /* @__PURE__ */ new Map();
      for (const row of existingOptsRes.rows) {
        existingVotesMap.set(row.id, row.votes || []);
      }
      await query(`DELETE FROM poll_options WHERE poll_id = $1`, [id]);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optId = opt.id && !opt.id.startsWith("temp-") ? opt.id : `opt-${Date.now()}-${i}`;
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
    res.json({
      id: poll.id,
      groupId: poll.group_id,
      title: poll.title,
      type: poll.type,
      description: poll.description,
      createdBy: poll.created_by,
      creatorName: user?.first_name || "Membre",
      creatorAvatar: user?.avatar || "",
      createdAt: poll.created_at,
      options: updatedOptionsRes.rows.map((opt) => ({
        id: opt.id,
        text: opt.text,
        dateValue: opt.dateValue,
        endDateValue: opt.endDateValue,
        startDate: opt.dateValue,
        endDate: opt.endDateValue,
        votes: opt.votes || []
      }))
    });
  } catch (err) {
    console.error("Error in PUT /polls/:id:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/polls/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM poll_options WHERE poll_id = $1`, [id]);
    await query(`DELETE FROM polls WHERE id = $1`, [id]);
    res.json({ success: true, pollId: id });
  } catch (err) {
    console.error("Error in DELETE /polls/:id:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/gallery", async (req, res) => {
  try {
    const groupId = req.query.groupId;
    let sql = `
      SELECT g.id, g.group_id as "groupId", g.image_url as "imageUrl",
             g.uploader_id as "uploaderId",
             COALESCE(concat(u.first_name, ' ', u.last_name), 'Membre') as "uploaderName",
             COALESCE(u.avatar, '') as "uploaderAvatar",
             g.caption, g.timestamp
      FROM gallery_items g
      LEFT JOIN users u ON g.uploader_id = u.id
    `;
    const params = [];
    if (groupId) {
      sql += ` WHERE g.group_id = $1`;
      params.push(groupId);
    }
    sql += ` ORDER BY g.timestamp DESC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /gallery:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/gallery", async (req, res) => {
  try {
    const {
      groupId,
      imageUrl,
      uploaderId = "user-me",
      caption = "",
      timestamp = (/* @__PURE__ */ new Date()).toISOString()
    } = req.body;
    const id = `gal-${Date.now()}`;
    await query(
      `INSERT INTO gallery_items (id, group_id, image_url, uploader_id, caption, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, groupId, imageUrl, uploaderId, caption, timestamp]
    );
    const userRes = await query(`SELECT first_name, last_name, avatar FROM users WHERE id = $1`, [uploaderId]);
    const user = userRes.rows[0];
    res.json({
      id,
      groupId,
      imageUrl,
      uploaderId,
      uploaderName: user ? `${user.first_name} ${user.last_name}`.trim() : "Membre",
      uploaderAvatar: user?.avatar || "",
      caption,
      timestamp
    });
  } catch (err) {
    console.error("Error in POST /gallery:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/gallery/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM gallery_items WHERE id = $1`, [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error("Error in DELETE /gallery/:id:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/tasks", async (req, res) => {
  try {
    const groupId = req.query.groupId;
    let sql = `
      SELECT t.id, t.group_id as "groupId", t.title, t.quantity,
             t.assigned_to_id as "assignedToId",
             u.first_name as "assignedToName",
             u.avatar as "assignedToAvatar",
             t.completed, t.category,
             t.created_by as "createdBy",
             t.created_at as "createdAt"
      FROM logistics_tasks t
      LEFT JOIN users u ON t.assigned_to_id = u.id
    `;
    const params = [];
    if (groupId) {
      sql += ` WHERE t.group_id = $1`;
      params.push(groupId);
    }
    sql += ` ORDER BY t.created_at ASC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /tasks:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/tasks", async (req, res) => {
  try {
    const {
      groupId,
      title,
      quantity = "1",
      assignedToId = null,
      category = "Mat\xE9riel",
      createdBy = "user-me"
    } = req.body;
    const taskId = `task-${Date.now()}`;
    await query(
      `INSERT INTO logistics_tasks (id, group_id, title, quantity, assigned_to_id, completed, category, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, NOW())`,
      [taskId, groupId, title, quantity, assignedToId, category, createdBy]
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
    res.json({
      id: taskId,
      groupId,
      title,
      quantity,
      assignedToId,
      assignedToName,
      assignedToAvatar,
      completed: false,
      category,
      createdBy,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Error in POST /tasks:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/tasks/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE logistics_tasks
       SET completed = NOT completed
       WHERE id = $1
       RETURNING id, completed`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in PUT /tasks/:id/toggle:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/tasks/:id/claim", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId = "user-me" } = req.body;
    await query(
      `UPDATE logistics_tasks
       SET assigned_to_id = $1
       WHERE id = $2`,
      [userId, id]
    );
    const uRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [userId]);
    const user = uRes.rows[0];
    res.json({
      id,
      assignedToId: userId,
      assignedToName: user?.first_name || null,
      assignedToAvatar: user?.avatar || null
    });
  } catch (err) {
    console.error("Error in PUT /tasks/:id/claim:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/tasks/:id/unclaim", async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      `UPDATE logistics_tasks
       SET assigned_to_id = NULL
       WHERE id = $1`,
      [id]
    );
    res.json({
      id,
      assignedToId: null,
      assignedToName: null,
      assignedToAvatar: null
    });
  } catch (err) {
    console.error("Error in PUT /tasks/:id/unclaim:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/expenses", async (req, res) => {
  try {
    const groupId = req.query.groupId;
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
    const params = [];
    if (groupId) {
      sql += ` WHERE e.group_id = $1`;
      params.push(groupId);
    }
    sql += ` ORDER BY e.date DESC, e.created_at DESC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /expenses:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/expenses", async (req, res) => {
  try {
    const {
      groupId,
      title,
      amount,
      paidById = "user-me",
      category = "Autre",
      date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      splitMode = "all",
      participantIds = [],
      sharesSnapshot = {}
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
        JSON.stringify(sharesSnapshot)
      ]
    );
    const userRes = await query(`SELECT first_name, avatar FROM users WHERE id = $1`, [paidById]);
    const user = userRes.rows[0];
    res.json({
      id,
      groupId,
      title,
      amount: Number(amount),
      paidById,
      paidByName: user?.first_name || "Membre",
      paidByAvatar: user?.avatar || "",
      category,
      date,
      splitMode,
      participantIds,
      sharesSnapshot,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Error in POST /expenses:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/notifications", async (req, res) => {
  try {
    const userId = req.query.userId || "user-me";
    const result = await query(
      `SELECT id, user_id as "userId", type, title, message, timestamp, read,
              group_id as "groupId", event_id as "eventId"
       FROM notifications
       WHERE user_id = $1
       ORDER BY timestamp DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /notifications:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/notifications/read-all", async (req, res) => {
  try {
    const userId = req.body.userId || "user-me";
    await query(`UPDATE notifications SET read = true WHERE user_id = $1`, [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error in PUT /notifications/read-all:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE notifications SET read = true WHERE id = $1`, [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error("Error in PUT /notifications/:id/read:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.delete("/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM notifications WHERE id = $1`, [id]);
    res.json({ success: true, id });
  } catch (err) {
    console.error("Error in DELETE /notifications/:id:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/invitations/send-email", async (req, res) => {
  try {
    const { toEmail, senderName, groupName, inviteLink } = req.body;
    if (!toEmail) {
      return res.status(400).json({ error: "toEmail is required" });
    }
    const fallbackBaseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}` || "http://localhost:3000";
    const result = await emailService.sendInvitation({
      toEmail,
      senderName: senderName || "Un ami",
      groupName,
      inviteLink: inviteLink || fallbackBaseUrl
    });
    res.json(result);
  } catch (err) {
    console.error("Error sending invitation email:", err);
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/reminders/send-email", async (req, res) => {
  try {
    const { toEmail, eventTitle, startDateTime, location, gpsUrl } = req.body;
    if (!toEmail || !eventTitle || !startDateTime) {
      return res.status(400).json({ error: "toEmail, eventTitle and startDateTime are required" });
    }
    const result = await emailService.sendEventReminder({
      toEmail,
      eventTitle,
      startDateTime,
      location,
      gpsUrl
    });
    res.json(result);
  } catch (err) {
    console.error("Error sending reminder email:", err);
    res.status(500).json({ error: err.message });
  }
});

// server/app.ts
dotenv3.config();
var app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use((req, _res, next) => {
  if (req.url.startsWith("/api") || req.originalUrl?.startsWith("/api")) {
    console.log(`[API] ${req.method} ${req.originalUrl || req.url}`);
  }
  next();
});
app.use("/api", apiRouter);

// server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PORT = process.env.PORT || 3e3;
var distPath = path.resolve(process.cwd(), "dist");
app.use(express2.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});
if (process.env.NODE_ENV !== "test") {
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
var index_default = app;
export {
  index_default as default
};
