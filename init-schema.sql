-- ====================================================================
-- OUTLYS - Script SQL complet d'initialisation du schéma Neon PostgreSQL
-- ====================================================================
-- Ce script crée toutes les tables, contraintes, clés primaires/étrangères
-- et index nécessaires au fonctionnement temps réel de l'application Outlys.
-- ====================================================================

-- 1. Extension UUID (optionnelle pour génération d'identifiants uniques si besoin)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 2. Table: users (Profils utilisateurs, comptes & authentification)
-- ====================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name TEXT NOT NULL,
    email VARCHAR(255),
    handle VARCHAR(100),
    avatar TEXT DEFAULT '',
    shares INTEGER DEFAULT 1,
    theme_preference VARCHAR(20) DEFAULT 'light',
    password_hash TEXT,
    google_id VARCHAR(255) UNIQUE,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches rapides d'utilisateurs et unicité conditionnelle
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL AND email <> '';
CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle) WHERE handle IS NOT NULL AND handle <> '';
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);

-- ====================================================================
-- 3. Table: groups (Groupes d'amis / événements)
-- ====================================================================
CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    cover_image TEXT DEFAULT 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1000&auto=format&fit=crop&q=80',
    created_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);

-- ====================================================================
-- 4. Table: group_members (Association Membres <-> Groupes avec rôles)
-- ====================================================================
CREATE TABLE IF NOT EXISTS group_members (
    group_id VARCHAR(100) REFERENCES groups(id) ON DELETE CASCADE,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

-- ====================================================================
-- 5. Table: friends (Relations d'amitié entre utilisateurs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS friends (
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    friend_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- ====================================================================
-- 6. Table: invitations (Tokens d'invitation aux groupes ou contacts)
-- ====================================================================
CREATE TABLE IF NOT EXISTS invitations (
    id VARCHAR(100) PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    group_id VARCHAR(100) REFERENCES groups(id) ON DELETE CASCADE,
    inviter_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'group',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_group_id ON invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- ====================================================================
-- 7. Table: notifications (Notifications in-app & push)
-- ====================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    group_id VARCHAR(100),
    event_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_timestamp ON notifications(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- ====================================================================
-- 8. Table: events (Agenda / Événements planifiés)
-- ====================================================================
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ,
    location VARCHAR(255) DEFAULT '',
    gps_url TEXT,
    description TEXT DEFAULT '',
    banner_image TEXT,
    organizer_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    reminder_24h BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime ASC);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);

-- ====================================================================
-- 9. Table: event_rsvps (Réponses de présence aux événements)
-- ====================================================================
CREATE TABLE IF NOT EXISTS event_rsvps (
    event_id VARCHAR(100) REFERENCES events(id) ON DELETE CASCADE,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'going',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON event_rsvps(user_id);

-- ====================================================================
-- 10. Table: chat_messages (Fil de discussion de groupe & système)
-- ====================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) REFERENCES groups(id) ON DELETE CASCADE,
    sender_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    text TEXT DEFAULT '',
    image_url TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    system_type VARCHAR(50),
    call_type VARCHAR(50),
    call_id VARCHAR(100),
    read_by JSONB DEFAULT '[]'::jsonb,
    reactions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_timestamp ON chat_messages(group_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);

-- ====================================================================
-- 11. Table: polls (Sondages de groupe : dates, choix uniques ou multiples)
-- ====================================================================
CREATE TABLE IF NOT EXISTS polls (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'single',
    description TEXT,
    created_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_group_id ON polls(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);

-- ====================================================================
-- 12. Table: poll_options (Options et votes JSON des sondages)
-- ====================================================================
CREATE TABLE IF NOT EXISTS poll_options (
    id VARCHAR(100) PRIMARY KEY,
    poll_id VARCHAR(100) REFERENCES polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    date_value TEXT,
    end_date_value TEXT,
    votes JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);

-- ====================================================================
-- 13. Table: gallery_items (Galerie photos et médias partagés)
-- ====================================================================
CREATE TABLE IF NOT EXISTS gallery_items (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) REFERENCES groups(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploader_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    caption TEXT DEFAULT '',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_group_timestamp ON gallery_items(group_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_uploader_id ON gallery_items(uploader_id);

-- ====================================================================
-- 14. Table: logistics_tasks (Tâches logistiques et matériels)
-- ====================================================================
CREATE TABLE IF NOT EXISTS logistics_tasks (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) REFERENCES groups(id) ON DELETE CASCADE,
    event_id VARCHAR(100) REFERENCES events(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    assigned_to_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    completed BOOLEAN DEFAULT FALSE,
    category VARCHAR(100) DEFAULT 'general',
    created_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_tasks_group_id ON logistics_tasks(group_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_logistics_tasks_event_id ON logistics_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_logistics_tasks_assigned_to ON logistics_tasks(assigned_to_id);

-- ====================================================================
-- 15. Table: expenses (Dépenses partagées et calcul des parts)
-- ====================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    paid_by_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(100) DEFAULT 'Autre',
    date DATE DEFAULT CURRENT_DATE,
    split_mode VARCHAR(50) DEFAULT 'all',
    participant_ids JSONB DEFAULT '[]'::jsonb,
    shares_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_group_date ON expenses(group_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_id ON expenses(paid_by_id);

-- ====================================================================
-- 16. Table: debt_settlements (Règlements de dettes et remboursements)
-- ====================================================================
CREATE TABLE IF NOT EXISTS debt_settlements (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100),
    from_user_id VARCHAR(100),
    to_user_id VARCHAR(100),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'settled',
    settled_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_settlements_group_id ON debt_settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_debt_settlements_users ON debt_settlements(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_debt_settlements_status ON debt_settlements(status);

-- ====================================================================
-- 17. Table: device_push_tokens (Tokens de notification push mobile/web)
-- ====================================================================
CREATE TABLE IF NOT EXISTS device_push_tokens (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    token TEXT NOT NULL,
    platform VARCHAR(50) DEFAULT 'mobile',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_id ON device_push_tokens(user_id);
