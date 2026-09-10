require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ Erreur : DATABASE_URL non définie dans le fichier .env');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- Nettoyage des anciennes tables si existantes
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS logistics_tasks CASCADE;
DROP TABLE IF EXISTS gallery_items CASCADE;
DROP TABLE IF EXISTS poll_options CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Table Utilisateurs (avec support mot de passe et Google OAuth)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    handle VARCHAR(50) UNIQUE,
    avatar TEXT,
    password_hash TEXT,
    google_id VARCHAR(255) UNIQUE,
    shares INT DEFAULT 1 CHECK (shares >= 1 AND shares <= 20),
    theme_preference VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table Relations d'amitié
CREATE TABLE friends (
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    friend_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'accepted',
    PRIMARY KEY (user_id, friend_id)
);

-- 3. Table Groupes
CREATE TABLE groups (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image TEXT,
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table Membres du groupe
CREATE TABLE group_members (
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- 5. Table Événements
CREATE TABLE events (
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
CREATE TABLE event_rsvps (
    event_id VARCHAR(50) REFERENCES events(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'going',
    PRIMARY KEY (event_id, user_id)
);

-- 7. Table Messages du Chat
CREATE TABLE chat_messages (
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
CREATE TABLE polls (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT,
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE poll_options (
    id VARCHAR(50) PRIMARY KEY,
    poll_id VARCHAR(50) REFERENCES polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    date_value DATE,
    votes JSONB DEFAULT '[]'::jsonb
);

-- 9. Table Galerie Médias
CREATE TABLE gallery_items (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploader_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Table Logistique
CREATE TABLE logistics_tasks (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    quantity VARCHAR(100),
    assigned_to_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    completed BOOLEAN DEFAULT FALSE,
    category VARCHAR(50) DEFAULT 'Matériel',
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Table Partage des Frais
CREATE TABLE expenses (
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

-- 12. Table Notifications
CREATE TABLE notifications (
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
`;

async function run() {
    try {
        await client.connect();
        console.log('Connexion à Render établie...');
        await client.query(sql);
        console.log('✅ Structure des tables réinitialisée avec succès (base vierge prête pour les tests) !');
    } catch (err) {
        console.error('❌ Erreur lors de l\'exécution du script :', err);
    } finally {
        await client.end();
    }
}

run();