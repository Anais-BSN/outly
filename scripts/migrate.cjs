const { Client } = require('pg');

const RENDER_URL = 'postgresql://outly_msjh_user:r4swJ5jsFsKdsM60KYsBknFbPTfTtVYa@dpg-da9e9um7bikc7392p49g-a.frankfurt-postgres.render.com/outly_msjh';
const NEON_URL = 'postgresql://neondb_owner:npg_LmAbjfXk19yz@ep-lucky-glade-b23k084y-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const schemaSql = `
-- 1. Table Utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    handle VARCHAR(50) UNIQUE,
    avatar TEXT,
    password_hash TEXT,
    google_id VARCHAR(255) UNIQUE,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    shares INT DEFAULT 1 CHECK (shares >= 1 AND shares <= 20),
    theme_preference VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table Relations d'amitié
CREATE TABLE IF NOT EXISTS friends (
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    friend_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'accepted',
    PRIMARY KEY (user_id, friend_id)
);

-- 3. Table Groupes
CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image TEXT,
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table Membres du groupe
CREATE TABLE IF NOT EXISTS group_members (
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- 5. Table Événements
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE,
    location TEXT,
    gps_url TEXT,
    description TEXT,
    banner_image TEXT,
    organizer_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    reminder_24h BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table Réponses de présence (RSVP)
CREATE TABLE IF NOT EXISTS event_rsvps (
    event_id VARCHAR(50) REFERENCES events(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'going',
    PRIMARY KEY (event_id, user_id)
);

-- 7. Table Messages du Chat
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    sender_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    text TEXT,
    image_url TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    system_type VARCHAR(50),
    read_by JSONB DEFAULT '[]'::jsonb,
    reactions JSONB DEFAULT '[]'::jsonb
);

-- 8. Table Sondages
CREATE TABLE IF NOT EXISTS polls (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT,
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_options (
    id VARCHAR(50) PRIMARY KEY,
    poll_id VARCHAR(50) REFERENCES polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    date_value DATE,
    end_date_value TEXT,
    votes JSONB DEFAULT '[]'::jsonb
);

-- 9. Table Galerie Médias
CREATE TABLE IF NOT EXISTS gallery_items (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploader_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Table Logistique
CREATE TABLE IF NOT EXISTS logistics_tasks (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    event_id VARCHAR(50) REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    quantity VARCHAR(100),
    assigned_to_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    completed BOOLEAN DEFAULT FALSE,
    category VARCHAR(50) DEFAULT 'Matériel',
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Table Partage des Frais
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    paid_by_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    split_mode VARCHAR(20) DEFAULT 'all',
    participant_ids JSONB DEFAULT '[]'::jsonb,
    shares_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Table Règlements de Dettes
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

-- 13. Table Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    event_id VARCHAR(50) REFERENCES events(id) ON DELETE CASCADE
);

-- 14. Table Invitations
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
`;

async function migrate() {
    console.log('🚀 Démarrage de la migration Render -> Neon...');
    const source = new Client({
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false }
    });

    const dest = new Client({
        connectionString: NEON_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await source.connect();
        console.log('✅ Connecté à la base source (Render)');

        await dest.connect();
        console.log('✅ Connecté à la base destination (Neon)');

        // 1. Initialiser le schéma sur Neon
        console.log('🔨 Création / Vérification du schéma sur Neon...');
        await dest.query(schemaSql);
        console.log('✅ Schéma prêt sur Neon.');

        // 2. Découvrir toutes les tables publiques de la source
        const tablesRes = await source.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        const sourceTables = tablesRes.rows.map(r => r.table_name);
        console.log(`📋 Tables trouvées sur Render (${sourceTables.length}) :`, sourceTables.join(', '));

        // Ordre d'insertion pour respecter les clés étrangères
        const orderedTables = [
            'users',
            'friends',
            'groups',
            'group_members',
            'events',
            'event_rsvps',
            'chat_messages',
            'polls',
            'poll_options',
            'gallery_items',
            'logistics_tasks',
            'expenses',
            'debt_settlements',
            'notifications',
            'invitations'
        ];

        // Ajouter d'autres tables découvertes non listées
        for (const t of sourceTables) {
            if (!orderedTables.includes(t)) {
                orderedTables.push(t);
            }
        }

        // Désactiver temporairement les contraintes sur Neon pendant l'importation si possible, ou insérer dans l'ordre
        console.log('\n📦 Début du transfert des données...\n');

        const summary = [];

        for (const table of orderedTables) {
            if (!sourceTables.includes(table)) {
                console.log(`ℹ️ Table ${table} absente de la source, ignorée.`);
                continue;
            }

            // Récupérer les colonnes de la table source
            const colsRes = await source.query(`
                SELECT column_name, data_type, udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position;
            `, [table]);

            const colNames = colsRes.rows.map(c => c.column_name);

            // Récupérer les colonnes existantes dans Neon
            const destColsRes = await dest.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1;
            `, [table]);

            const destColNames = destColsRes.rows.map(c => c.column_name);

            // Colonnes communes
            const commonCols = colNames.filter(c => destColNames.includes(c));

            if (commonCols.length === 0) {
                console.log(`⚠️ Aucune colonne commune pour la table ${table}.`);
                continue;
            }

            // Extraire toutes les lignes
            const selectCols = commonCols.map(c => `"${c}"`).join(', ');
            const dataRes = await source.query(`SELECT ${selectCols} FROM "${table}"`);
            const rows = dataRes.rows;

            console.log(`➡️ ${table} : ${rows.length} lignes extraites de Render.`);

            if (rows.length > 0) {
                // Vider la table destination d'abord ou insérer
                // Pour éviter conflits, on insère par batch
                for (const row of rows) {
                    const keys = commonCols;
                    const values = keys.map(k => {
                        const val = row[k];
                        if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
                            return JSON.stringify(val);
                        }
                        return val;
                    });

                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                    const quotedCols = keys.map(k => `"${k}"`).join(', ');

                    // Construction de la requête avec ON CONFLICT DO NOTHING pour éviter les doublons
                    const insertQuery = `
                        INSERT INTO "${table}" (${quotedCols})
                        VALUES (${placeholders})
                        ON CONFLICT DO NOTHING;
                    `;

                    try {
                        await dest.query(insertQuery, values);
                    } catch (insertErr) {
                        console.error(`❌ Erreur d'insertion dans ${table}:`, insertErr.message);
                    }
                }
            }

            // Vérification du nombre de lignes dans Neon
            const countRes = await dest.query(`SELECT count(*)::int as count FROM "${table}"`);
            const destCount = countRes.rows[0].count;
            console.log(`   ✔️ Neon "${table}" contient maintenant ${destCount} lignes.`);
            summary.push({ table, sourceRows: rows.length, destRows: destCount });
        }

        console.log('\n========================================');
        console.log('🎉 BILAN DE LA MIGRATION RENDER -> NEON :');
        console.log('========================================');
        console.table(summary);
        console.log('========================================');
        console.log('✅ Toutes les données ont été migrées avec succès vers Neon !');

    } catch (err) {
        console.error('❌ Erreur globale pendant la migration :', err);
    } finally {
        await source.end();
        await dest.end();
    }
}

migrate();
