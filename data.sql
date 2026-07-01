-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-User (many-to-many)
CREATE TABLE role_user (
    role_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, user_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Role-Permission (many-to-many)
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Activity Logs table
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Error Logs table
CREATE TABLE error_logs (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    file_path VARCHAR(500) NULL,
    line_number INTEGER NULL,
    stack_trace TEXT NULL,
    user_id INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- System Settings table
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    setting_type VARCHAR(50) DEFAULT 'text',
    description TEXT NULL,
    updated_by INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default roles
INSERT INTO roles (name, display_name, description) VALUES 
('super-admin', 'Super Administrator', 'Full system control with all permissions'),
('admin', 'Administrator', 'Administrator with assigned permissions');

-- Insert default permissions (modules/pages)
INSERT INTO permissions (name, display_name, module, description) VALUES 
('dashboard-view', 'View Dashboard', 'dashboard', 'Access to main dashboard'),
('users-view', 'View Users', 'users', 'View user list'),
('users-create', 'Create Users', 'users', 'Create new users'),
('users-edit', 'Edit Users', 'users', 'Edit existing users'),
('users-delete', 'Delete Users', 'users', 'Delete users'),
('roles-view', 'View Roles', 'roles', 'View roles list'),
('roles-create', 'Create Roles', 'roles', 'Create new roles'),
('roles-edit', 'Edit Roles', 'roles', 'Edit existing roles'),
('roles-delete', 'Delete Roles', 'roles', 'Delete roles'),
('permissions-view', 'View Permissions', 'permissions', 'View permissions list'),
('permissions-assign', 'Assign Permissions', 'permissions', 'Assign permissions to roles'),
('settings-view', 'View Settings', 'settings', 'View system settings'),
('settings-edit', 'Edit Settings', 'settings', 'Edit system settings'),
('logs-view', 'View Logs', 'logs', 'View activity and error logs'),
('registration-manage', 'Manage Registration', 'system', 'Enable/disable user registration');

-- Assign all permissions to super-admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Insert registration enabled setting (1 = enabled, 0 = disabled)
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES 
('registration_enabled', '1', 'boolean', 'Enable or disable user registration form');

-- Create super admin (password will be changed via Laravel)
-- Default password: password123 (we'll hash it properly in Laravel)
INSERT INTO users (name, email, password, created_by) VALUES 
('Super Admin', 'superadmin@reverence.com', '', NULL);

-- Note: We'll update the password hash using Laravel's command

-- Create sessions table for Laravel
CREATE TABLE sessions (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id BIGINT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    payload TEXT NOT NULL,
    last_activity INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for last_activity
CREATE INDEX sessions_last_activity_idx ON sessions(last_activity);

-- Create cache table
CREATE TABLE cache (
    key VARCHAR(255) NOT NULL PRIMARY KEY,
    value TEXT NOT NULL,
    expiration INTEGER NOT NULL
);

-- Create cache_locks table
CREATE TABLE cache_locks (
    key VARCHAR(255) NOT NULL PRIMARY KEY,
    owner VARCHAR(255) NOT NULL,
    expiration INTEGER NOT NULL
);

-- Add updated_at column to activity_logs
ALTER TABLE activity_logs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Also add updated_at to other tables if needed
ALTER TABLE error_logs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE system_settings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update roles table to have timestamps if not already
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update permissions table
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add any missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS remember_token VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Assign super-admin role to user
INSERT INTO role_user (role_id, user_id) 
VALUES (1, 1);


-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS province VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sector VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS village VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_type VARCHAR(50) DEFAULT 'Regular';
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ministry_role VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_name VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT NULL;


-- Insert more module permissions for worship team
INSERT INTO permissions (name, display_name, module, description) VALUES 
('music-view', 'View Music Ministry', 'music', 'Access Music & Evangelism page'),
('intercession-view', 'View Intercession', 'intercession', 'Access Intercession & Growth page'),
('fellowship-view', 'View Social Fellowship', 'fellowship', 'Access Social Fellowship page'),
('discipline-view', 'View Discipline', 'discipline', 'Access Discipline page'),
('finance-view', 'View Finance', 'finance', 'Access Financial page'),
('announcements-view', 'View Announcements', 'announcements', 'Access Announcements page'),
('reports-view', 'View Reports', 'reports', 'Access Reports page'),
('chats-view', 'View Chats', 'chats', 'Access Chats page')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, display_name, module, description) 
VALUES ('module-assign', 'Assign Modules', 'settings', 'Allow assigning modules to users')
ON CONFLICT (name) DO NOTHING;

-- Assign to super-admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE name = 'module-assign'
ON CONFLICT DO NOTHING;

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMP NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create music_repertoire table
CREATE TABLE IF NOT EXISTS music_repertoire (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    key_signature VARCHAR(50),
    tempo INTEGER,
    lyrics TEXT,
    youtube_link VARCHAR(500),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create events table for fellowship/discipline
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop old tables if they exist
DROP TABLE IF EXISTS role_page_features CASCADE;
DROP TABLE IF EXISTS features CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;

-- Create pages table (main modules/sections)
CREATE TABLE pages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) DEFAULT 'fa-folder',
    route VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create features table (actions within a page)
CREATE TABLE features (
    id SERIAL PRIMARY KEY,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_id, name)
);

-- Create role_page_features table (what features a role has on which page)
CREATE TABLE role_page_features (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, page_id, feature_id)
);

-- Insert default pages
INSERT INTO pages (name, display_name, icon, route, sort_order) VALUES 
('dashboard', 'Dashboard', 'fa-tachometer-alt', 'admin.dashboard', 1),
('user-management', 'User Management', 'fa-users', 'admin.users.index', 2),
('music-ministry', 'Music & Evangelism', 'fa-music', 'music.index', 3),
('intercession', 'Intercession & Growth', 'fa-pray', 'intercession.index', 4),
('fellowship', 'Social Fellowship', 'fa-users', 'fellowship.index', 5),
('discipline', 'Discipline', 'fa-gavel', 'discipline.index', 6),
('financial', 'Financial', 'fa-coins', 'financial.index', 7),
('announcements', 'Announcements', 'fa-bullhorn', 'announcements.index', 8),
('reports', 'Reports', 'fa-chart-bar', 'reports.index', 9),
('chats', 'Chats', 'fa-comments', 'chats.index', 10);

-- Insert features for Dashboard (page_id = 1)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(1, 'view', 'View Dashboard', 'Access to main dashboard');

-- Insert features for User Management (page_id = 2)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(2, 'view', 'View Users', 'Can see list of users'),
(2, 'create', 'Create Users', 'Can add new users'),
(2, 'edit', 'Edit Users', 'Can edit existing users'),
(2, 'delete', 'Delete Users', 'Can delete users');

-- Insert features for Music Ministry (page_id = 3)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(3, 'view', 'View Music', 'Can view music section'),
(3, 'manage-songs', 'Manage Songs', 'Add/edit/delete songs'),
(3, 'manage-events', 'Manage Events', 'Manage music events'),
(3, 'manage-team', 'Manage Team', 'Manage worship team members');

-- Insert features for Intercession (page_id = 4)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(4, 'view', 'View Prayers', 'View prayer requests'),
(4, 'create', 'Add Prayers', 'Add prayer requests'),
(4, 'manage', 'Manage Prayers', 'Manage all prayer requests');

-- Insert features for Fellowship (page_id = 5)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(5, 'view', 'View Events', 'View fellowship events'),
(5, 'create', 'Create Events', 'Create new events'),
(5, 'manage', 'Manage Events', 'Manage all events');

-- Insert features for Discipline (page_id = 6)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(6, 'view', 'View Records', 'View discipline records'),
(6, 'create', 'Add Records', 'Add discipline records'),
(6, 'manage', 'Manage Records', 'Manage all records');

-- Insert features for Financial (page_id = 7)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(7, 'view', 'View Finances', 'View financial records'),
(7, 'add-income', 'Add Income', 'Add income/offerings'),
(7, 'add-expense', 'Add Expense', 'Add expenses'),
(7, 'view-reports', 'View Reports', 'View financial reports'),
(7, 'export', 'Export Data', 'Export financial data');

-- Insert features for Announcements (page_id = 8)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(8, 'view', 'View Announcements', 'View announcements'),
(8, 'create', 'Create Announcements', 'Create new announcements'),
(8, 'edit', 'Edit Announcements', 'Edit announcements'),
(8, 'delete', 'Delete Announcements', 'Delete announcements'),
(8, 'publish', 'Publish', 'Publish/unpublish announcements');

-- Insert features for Reports (page_id = 9)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(9, 'view', 'View Reports', 'View all reports'),
(9, 'export', 'Export Reports', 'Export reports');

-- Insert features for Chats (page_id = 10)
INSERT INTO features (page_id, name, display_name, description) VALUES 
(10, 'view', 'View Chats', 'View chat conversations'),
(10, 'send', 'Send Messages', 'Send messages'),
(10, 'manage', 'Manage Chats', 'Manage chat settings');

-- Give Super Admin (role_id = 1) all features
INSERT INTO role_page_features (role_id, page_id, feature_id)
SELECT 1, f.page_id, f.id
FROM features f
ON CONFLICT DO NOTHING;

-- First, drop the existing table
DROP TABLE IF EXISTS role_page_features CASCADE;

-- Recreate without timestamps (or add the columns)
CREATE TABLE role_page_features (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, page_id, feature_id)
);

-- If you want to keep the updated_at column, add it:
-- ALTER TABLE role_page_features ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    key_signature VARCHAR(10),
    tempo INTEGER,
    lyrics TEXT,
    youtube_link VARCHAR(500),
    assigned_singer VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create playlist_songs table (order of songs in playlist)
CREATE TABLE IF NOT EXISTS playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, song_id)
);

-- Create singers table
CREATE TABLE IF NOT EXISTS singers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    voice_part VARCHAR(50),
    performance_level VARCHAR(50),
    phone VARCHAR(20),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create photo_gallery table
CREATE TABLE IF NOT EXISTS photo_gallery (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    description TEXT,
    event_date DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    leader_id INTEGER REFERENCES users(id),
    member_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups_table(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Create public_board table
CREATE TABLE IF NOT EXISTS public_board (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create action_plans table
CREATE TABLE IF NOT EXISTS action_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add singer-specific fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_singer BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_part VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS singer_level VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS singer_notes TEXT;
-- First, drop the existing table
DROP TABLE IF EXISTS playlist_songs CASCADE;

-- Recreate without updated_at (or add the column)
CREATE TABLE playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, song_id)
);

-- Get the page_id for music-ministry (usually 3)
-- First, check what pages exist
SELECT id, name, display_name FROM pages WHERE name = 'music-ministry';

-- Assuming music-ministry page id is 3, add sub-features
INSERT INTO features (page_id, name, display_name, description) VALUES 
(3, 'view-playlists', 'View Playlists', 'Can view playlists and songs'),
(3, 'manage-playlists', 'Manage Playlists', 'Can create, edit, delete playlists'),
(3, 'view-singers', 'View Singers', 'Can view singers list'),
(3, 'manage-singers', 'Manage Singers', 'Can add, edit, delete singers'),
(3, 'view-gallery', 'View Photo Gallery', 'Can view photos'),
(3, 'manage-gallery', 'Manage Photo Gallery', 'Can upload, edit, delete photos'),
(3, 'view-groups', 'View Groups', 'Can view worship groups'),
(3, 'manage-groups', 'Manage Groups', 'Can create, edit, delete groups'),
(3, 'view-board', 'View Public Board', 'Can view announcements'),
(3, 'manage-board', 'Manage Public Board', 'Can create, edit, delete announcements'),
(3, 'view-actionplan', 'View Action Plan', 'Can view action plans'),
(3, 'manage-actionplan', 'Manage Action Plan', 'Can create, edit, delete action plans')
ON CONFLICT (page_id, name) DO NOTHING;

-- Get the page_id for music-ministry
DO $$
DECLARE
    music_page_id INTEGER;
BEGIN
    SELECT id INTO music_page_id FROM pages WHERE name = 'music-ministry';
    
    -- Insert all sub-features (using ON CONFLICT to avoid duplicates)
    INSERT INTO features (page_id, name, display_name, description) VALUES 
    (music_page_id, 'view-playlists', 'View Playlists', 'Can see Playlists tab and view songs'),
    (music_page_id, 'manage-playlists', 'Manage Playlists', 'Can create, edit, delete playlists'),
    (music_page_id, 'view-singers', 'View Singers', 'Can see Manage Singers tab'),
    (music_page_id, 'manage-singers', 'Manage Singers', 'Can add, edit, delete singers'),
    (music_page_id, 'view-gallery', 'View Photo Gallery', 'Can see Photo Gallery tab'),
    (music_page_id, 'manage-gallery', 'Manage Photo Gallery', 'Can upload and delete photos'),
    (music_page_id, 'view-groups', 'View Groups', 'Can see Groups tab'),
    (music_page_id, 'manage-groups', 'Manage Groups', 'Can create, edit, delete groups'),
    (music_page_id, 'view-board', 'View Public Board', 'Can see Public Board tab'),
    (music_page_id, 'manage-board', 'Manage Public Board', 'Can create, edit, delete announcements'),
    (music_page_id, 'view-actionplan', 'View Action Plan', 'Can see Action Plan tab'),
    (music_page_id, 'manage-actionplan', 'Manage Action Plan', 'Can create, edit, delete tasks')
    ON CONFLICT (page_id, name) DO NOTHING;
END $$;

-- Get the page_id for music-ministry
DO $$
DECLARE
    music_page_id INTEGER;
BEGIN
    SELECT id INTO music_page_id FROM pages WHERE name = 'music-ministry';
    
    -- Delete old combined permissions
    DELETE FROM features WHERE page_id = music_page_id AND name IN ('view-playlists', 'manage-playlists', 'view-songs', 'manage-songs');
    
    -- Insert granular permissions for SONGS
    INSERT INTO features (page_id, name, display_name, description) VALUES 
    (music_page_id, 'view-songs', 'View Songs', 'Can see the Songs list'),
    (music_page_id, 'create-songs', 'Create Songs', 'Can add new songs'),
    (music_page_id, 'edit-songs', 'Edit Songs', 'Can edit existing songs'),
    (music_page_id, 'delete-songs', 'Delete Songs', 'Can delete songs')
    ON CONFLICT (page_id, name) DO NOTHING;
    
    -- Insert granular permissions for PLAYLISTS
    INSERT INTO features (page_id, name, display_name, description) VALUES 
    (music_page_id, 'view-playlists', 'View Playlists', 'Can see the Playlists list'),
    (music_page_id, 'create-playlists', 'Create Playlists', 'Can create new playlists'),
    (music_page_id, 'edit-playlists', 'Edit Playlists', 'Can edit playlist details and add/remove songs'),
    (music_page_id, 'delete-playlists', 'Delete Playlists', 'Can delete playlists')
    ON CONFLICT (page_id, name) DO NOTHING;
    
    -- Also keep singer permissions
    INSERT INTO features (page_id, name, display_name, description) VALUES 
    (music_page_id, 'view-singers', 'View Singers', 'Can see singers list'),
    (music_page_id, 'manage-singers', 'Manage Singers', 'Can edit singer voice part and level')
    ON CONFLICT (page_id, name) DO NOTHING;
END $$;

-- Get the page_id for music-ministry
DO $$
DECLARE
    music_page_id INTEGER;
BEGIN
    SELECT id INTO music_page_id FROM pages WHERE name = 'music-ministry';
    
    -- Delete all old confusing permissions
    DELETE FROM features WHERE page_id = music_page_id;
    
    -- Insert CLEAN permissions
    INSERT INTO features (page_id, name, display_name, description) VALUES 
    -- Main access
    (music_page_id, 'access', 'Access Music Module', 'Can see and enter Music & Evangelism module'),
    
    -- Songs permissions
    (music_page_id, 'view-songs', 'View Songs', 'Can see the songs list'),
    (music_page_id, 'create-songs', 'Create Songs', 'Can add new songs'),
    (music_page_id, 'edit-songs', 'Edit Songs', 'Can edit existing songs'),
    (music_page_id, 'delete-songs', 'Delete Songs', 'Can delete songs'),
    
    -- Playlists permissions
    (music_page_id, 'view-playlists', 'View Playlists', 'Can see playlists'),
    (music_page_id, 'create-playlists', 'Create Playlists', 'Can create new playlists'),
    (music_page_id, 'edit-playlists', 'Edit Playlists', 'Can edit playlists and add/remove songs'),
    (music_page_id, 'delete-playlists', 'Delete Playlists', 'Can delete playlists'),
    
    -- Singers permissions
    (music_page_id, 'view-singers', 'View Singers', 'Can see singers list'),
    (music_page_id, 'manage-singers', 'Manage Singers', 'Can edit singer voice part and level')
    
    ON CONFLICT (page_id, name) DO NOTHING;
END $$;

-- Get the page_id for music-ministry
DO $$
DECLARE
    music_page_id INTEGER;
BEGIN
    SELECT id INTO music_page_id FROM pages WHERE name = 'music-ministry';
    
    -- Delete all existing features
    DELETE FROM features WHERE page_id = music_page_id;
    
    -- ========== TAB 1: PLAYLIST TAB ==========
    INSERT INTO features (page_id, name, display_name, description) VALUES 
    (music_page_id, 'view-playlist-tab', 'View Playlist Tab', 'Can see the Playlist tab'),
    (music_page_id, 'view-songs', 'View Songs', 'Can see songs list'),
    (music_page_id, 'add-songs', 'Add Songs', 'Can add new songs'),
    (music_page_id, 'edit-songs', 'Edit Songs', 'Can edit existing songs'),
    (music_page_id, 'delete-songs', 'Delete Songs', 'Can delete songs'),
    (music_page_id, 'view-playlists', 'View Playlists', 'Can see playlists list'),
    (music_page_id, 'add-playlists', 'Add Playlists', 'Can create new playlists'),
    (music_page_id, 'edit-playlists', 'Edit Playlists', 'Can edit playlists and add/remove songs'),
    (music_page_id, 'delete-playlists', 'Delete Playlists', 'Can delete playlists');
    
    -- ========== TAB 2: PHOTO GALLERY TAB ==========
    INSERT INTO features (page_id, name, display_name, description) VALUES 
    (music_page_id, 'view-gallery-tab', 'View Gallery Tab', 'Can see the Photo Gallery tab'),
    (music_page_id, 'view-gallery', 'View Photos', 'Can see photos in gallery'),
    (music_page_id, 'add-gallery', 'Add Photos', 'Can upload new photos'),
    (music_page_id, 'edit-gallery', 'Edit Photos', 'Can edit photo details'),
    (music_page_id, 'delete-gallery', 'Delete Photos', 'Can delete photos');
    
    -- ========== TAB 3: GROUPS TAB ==========
    INSERT INTO features (page_id, name, display_name, description) VALUES 
    (music_page_id, 'view-groups-tab', 'View Groups Tab', 'Can see the Groups tab'),
    (music_page_id, 'view-groups', 'View Groups', 'Can see groups list'),
    (music_page_id, 'add-groups', 'Add Groups', 'Can create new groups'),
    (music_page_id, 'edit-groups', 'Edit Groups', 'Can edit group details'),
    (music_page_id, 'delete-groups', 'Delete Groups', 'Can delete groups');
    
    -- ========== TAB 4: PUBLIC BOARD TAB ==========
    INSERT INTO features (page_id, name, display_name, description) VALUES 
    (music_page_id, 'view-board-tab', 'View Board Tab', 'Can see the Public Board tab'),
    (music_page_id, 'view-board', 'View Posts', 'Can see board posts'),
    (music_page_id, 'add-board', 'Add Posts', 'Can create new posts'),
    (music_page_id, 'edit-board', 'Edit Posts', 'Can edit posts'),
    (music_page_id, 'delete-board', 'Delete Posts', 'Can delete posts');
    
END $$;

-- Create service teams table
CREATE TABLE IF NOT EXISTS service_teams (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    number_of_teams INTEGER DEFAULT 1,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create team_members table (members assigned to each team)
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    service_team_id INTEGER REFERENCES service_teams(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    voice_part VARCHAR(50),
    performance_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- First, drop the existing table
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS service_teams CASCADE;

-- Recreate service_teams without updated_at column (or with timestamps disabled)
CREATE TABLE service_teams (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    number_of_teams INTEGER DEFAULT 1,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recreate team_members table
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    service_team_id INTEGER REFERENCES service_teams(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    voice_part VARCHAR(50),
    performance_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create contributions table
CREATE TABLE IF NOT EXISTS contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    term INTEGER NOT NULL,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    payment_date TIMESTAMP NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    notes TEXT,
    submitted_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, term, year)
);

-- Create contribution_settings table
CREATE TABLE IF NOT EXISTS contribution_settings (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL UNIQUE,
    term1_amount DECIMAL(15, 2) DEFAULT 0,
    term2_amount DECIMAL(15, 2) DEFAULT 0,
    term3_amount DECIMAL(15, 2) DEFAULT 0,
    term4_amount DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert current year settings
INSERT INTO contribution_settings (year, term1_amount, term2_amount, term3_amount, term4_amount, is_active)
VALUES (2026, 48000, 36000, 36000, 0, true)
ON CONFLICT (year) DO NOTHING;


-- Create daily_devotions table
CREATE TABLE IF NOT EXISTS daily_devotions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    bible_verse VARCHAR(255),
    date DATE NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create devotion_attempts table (track who has read)
CREATE TABLE IF NOT EXISTS devotion_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    devotion_id INTEGER REFERENCES daily_devotions(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, devotion_id)
);

-- Create action_plans_intercession table
CREATE TABLE IF NOT EXISTS action_plans_intercession (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    assigned_to INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spiritual_forms table
CREATE TABLE IF NOT EXISTS spiritual_forms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create form_submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES spiritual_forms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    answers JSONB,
    score DECIMAL(5,2) DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create archives table
CREATE TABLE IF NOT EXISTS spiritual_archives (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) DEFAULT 'sermon',
    file_path VARCHAR(500),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Drop existing tables if needed
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS spiritual_forms CASCADE;

-- Create spiritual_forms table with full structure
CREATE TABLE spiritual_forms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions JSONB NOT NULL,
    settings JSONB DEFAULT '{"is_published": false, "allow_retake": false, "show_score": true}',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create form_submissions table
CREATE TABLE form_submissions (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES spiritual_forms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    answers JSONB,
    score DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add is_active column to spiritual_forms
ALTER TABLE spiritual_forms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing forms to have is_active = true
UPDATE spiritual_forms SET is_active = true WHERE is_active IS NULL;

-- Get the page_id for intercession (assuming intercession page exists)
-- First check if intercession page exists
SELECT id, name FROM pages WHERE name = 'intercession';

-- If intercession page exists (let's say id = 4), add form management features
INSERT INTO features (page_id, name, display_name, description) VALUES 
(4, 'create-forms', 'Create Forms', 'Can create new spiritual forms'),
(4, 'edit-forms', 'Edit Forms', 'Can edit existing forms'),
(4, 'delete-forms', 'Delete Forms', 'Can delete forms'),
(4, 'view-submissions', 'View Submissions', 'Can view form responses')
ON CONFLICT (page_id, name) DO NOTHING;
-- Create devotions table
CREATE TABLE IF NOT EXISTS devotions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    bible_verse VARCHAR(255),
    date DATE NOT NULL,
    created_by INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_devotion_completions table to track who marked as read
CREATE TABLE IF NOT EXISTS user_devotion_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    devotion_id INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_devotion UNIQUE (user_id, devotion_id)
);

-- Create indexes for better performance
CREATE INDEX idx_devotions_date ON devotions(date);
CREATE INDEX idx_devotions_is_active ON devotions(is_active);
CREATE INDEX idx_user_devotion_completions_user_id ON user_devotion_completions(user_id);
CREATE INDEX idx_user_devotion_completions_devotion_id ON user_devotion_completions(devotion_id);

-- Insert sample devotion for today
INSERT INTO devotions (title, content, bible_verse, date, created_by, is_active) 
VALUES (
    'Walking in Faith',
    'Faith is the assurance of things hoped for, the conviction of things not seen. Today, we are reminded that God''s promises are true and He is faithful to complete the good work He started in us. Let us walk not by sight, but by faith, trusting in His perfect plan for our lives.',
    'Hebrews 11:1 - "Now faith is the assurance of things hoped for, the conviction of things not seen."',
    CURRENT_DATE,
    1,
    true
);

-- Insert some past devotions
INSERT INTO devotions (title, content, bible_verse, date, created_by, is_active) 
VALUES 
(
    'The Power of Prayer',
    'Prayer is our direct line to God. It is not just about asking for things, but about building a relationship with our Creator. Through prayer, we find peace, guidance, and strength for each day. Make prayer a priority in your life.',
    'Philippians 4:6 - "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."',
    CURRENT_DATE - INTERVAL '1 day',
    1,
    true
),
(
    'Love One Another',
    'God''s greatest commandment is to love. Love is patient, love is kind. It does not envy, it does not boast, it is not proud. As followers of Christ, we are called to demonstrate this love to everyone we meet, regardless of their background or beliefs.',
    'John 13:34 - "A new command I give you: Love one another. As I have loved you, so you must love one another."',
    CURRENT_DATE - INTERVAL '2 days',
    1,
    true
),
(
    'Finding Peace in Chaos',
    'In the midst of life''s storms, God offers us His perfect peace. This peace is not the absence of trouble, but the presence of God. When we fix our eyes on Jesus, He calms our fears and gives us rest for our souls.',
    'John 14:27 - "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid."',
    CURRENT_DATE - INTERVAL '3 days',
    1,
    true
);
-- ============================================
-- 1. FORMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS forms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions TEXT,
    settings TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. FORM SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS form_submissions (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    answers TEXT,
    score DECIMAL(5,2),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. DEVOTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS devotions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    bible_verse VARCHAR(255),
    date DATE NOT NULL,
    created_by INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. USER DEVOTION COMPLETIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_devotion_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    devotion_id INTEGER NOT NULL REFERENCES devotions(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_devotion UNIQUE (user_id, devotion_id)
);

-- ============================================
-- 5. ACTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS action_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    user_id INTEGER NOT NULL,
    assigned_to INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_devotions_date ON devotions(date);
CREATE INDEX IF NOT EXISTS idx_devotions_is_active ON devotions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_devotion_completions_user_id ON user_devotion_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devotion_completions_devotion_id ON user_devotion_completions(devotion_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_user_id ON action_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_status ON action_plans(status);

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Sample Form
INSERT INTO forms (title, description, questions, settings, is_active, created_by) VALUES (
    'Spiritual Growth Assessment',
    'Assess your current spiritual growth and identify areas for improvement',
    '[{"id":1,"question":"How often do you read the Bible?","type":"multiple_choice","options":["Daily","Weekly","Monthly","Rarely"]},{"id":2,"question":"How often do you pray?","type":"multiple_choice","options":["Multiple times daily","Once daily","Few times a week","Rarely"]}]',
    '{"is_published":true}',
    true,
    1
);

-- Sample Devotion for Today
INSERT INTO devotions (title, content, bible_verse, date, created_by, is_active) VALUES (
    'Walking in Faith',
    'Faith is the assurance of things hoped for, the conviction of things not seen. Today, we are reminded that God''s promises are true and He is faithful to complete the good work He started in us. Let us walk not by sight, but by faith, trusting in His perfect plan for our lives.',
    'Hebrews 11:1 - "Now faith is the assurance of things hoped for, the conviction of things not seen."',
    CURRENT_DATE,
    1,
    true
);

-- Sample Past Devotions
INSERT INTO devotions (title, content, bible_verse, date, created_by, is_active) VALUES 
(
    'The Power of Prayer',
    'Prayer is our direct line to God. It is not just about asking for things, but about building a relationship with our Creator. Through prayer, we find peace, guidance, and strength for each day.',
    'Philippians 4:6 - "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."',
    CURRENT_DATE - INTERVAL '1 day',
    1,
    true
),
(
    'Love One Another',
    'God''s greatest commandment is to love. Love is patient, love is kind. It does not envy, it does not boast, it is not proud. As followers of Christ, we are called to demonstrate this love to everyone we meet.',
    'John 13:34 - "A new command I give you: Love one another. As I have loved you, so you must love one another."',
    CURRENT_DATE - INTERVAL '2 days',
    1,
    true
),
(
    'Finding Peace in Chaos',
    'In the midst of life''s storms, God offers us His perfect peace. This peace is not the absence of trouble, but the presence of God. When we fix our eyes on Jesus, He calms our fears.',
    'John 14:27 - "Peace I leave with you; my peace I give you. I do not give to you as the world gives."',
    CURRENT_DATE - INTERVAL '3 days',
    1,
    true
);

-- Sample Action Plan
INSERT INTO action_plans (title, description, due_date, status, user_id, created_by) VALUES (
    'Daily Bible Reading Plan',
    'Read one chapter of the Bible every day for 30 days',
    CURRENT_DATE + INTERVAL '30 days',
    'pending',
    1,
    1
);
-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions TEXT,
    settings TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create form_submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    answers TEXT,
    score DECIMAL(5,2),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS action_plan_tasks (
    id SERIAL PRIMARY KEY,
    action_plan_id INTEGER NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    due_date DATE,
    amount DECIMAL(10,2),
    target VARCHAR(255),
    timeline VARCHAR(100),
    action_details TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Add content_rw column to devotions table
ALTER TABLE devotions ADD COLUMN IF NOT EXISTS content_rw TEXT;
-- Create archive sections table
CREATE TABLE IF NOT EXISTS archive_sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create archive pages table
CREATE TABLE IF NOT EXISTS archive_pages (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES archive_sections(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_archive_pages_section_id ON archive_pages(section_id);
CREATE INDEX IF NOT EXISTS idx_archive_pages_is_published ON archive_pages(is_published);
-- First, drop the existing table if needed (this will delete existing data)
DROP TABLE IF EXISTS form_submissions CASCADE;

-- Recreate form_submissions table with correct columns
CREATE TABLE form_submissions (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    answers TEXT,
    score DECIMAL(5,2),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint
ALTER TABLE form_submissions 
ADD CONSTRAINT fk_form_submissions_form_id 
FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;
-- Add missing columns to form_submissions
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- First, check if user_id column exists, if not add it
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Add other missing columns if they don't exist
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS assigned_to INTEGER;
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to set user_id = created_by where user_id is null
UPDATE action_plans SET user_id = created_by WHERE user_id IS NULL;

-- Add foreign key constraints (optional, but recommended)
-- ALTER TABLE action_plans ADD CONSTRAINT fk_action_plans_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- Drop existing table
DROP TABLE IF EXISTS action_plans CASCADE;

-- Recreate action_plans table with correct structure
CREATE TABLE action_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    user_id INTEGER NOT NULL,
    assigned_to INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint
ALTER TABLE action_plans 
ADD CONSTRAINT fk_action_plans_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create families table
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255),
    description TEXT,
    motto TEXT,
    meeting_day VARCHAR(50),
    meeting_time TIME,
    meeting_location TEXT,
    created_by INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(family_id, user_id)
);

-- Create family_tasks table
CREATE TABLE IF NOT EXISTS family_tasks (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    assigned_to INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- Create family_action_plans table
CREATE TABLE IF NOT EXISTS family_action_plans (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'planning',
    progress INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- Insert sample families
INSERT INTO families (name, parent_name, description, motto, created_by) VALUES
('Amahero', 'Niyiramana Mediatrice', 'Mugire umwete wo kubana n''abantu bose amahoro', 'Peace and Unity', 1),
('Gukiranuka', 'NZABANA Azarias', 'Ujuye ukiranuka ugeze ku gupfa', 'Righteousness', 1),
('Urukundo', 'MUKASHEMA Clemence', 'Ni imwe mu famille zigize Rwf', 'Love and Care', 1);

-- Insert sample members
INSERT INTO family_members (family_id, user_id, role) VALUES
(1, 1, 'leader'),
(2, 1, 'leader'),
(3, 1, 'leader');

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) NULL;

ALTER TABLE photo_gallery ADD COLUMN IF NOT EXISTS category VARCHAR(100) NULL;
ALTER TABLE photo_gallery ADD COLUMN IF NOT EXISTS tags TEXT NULL;
ALTER TABLE photo_gallery ADD COLUMN IF NOT EXISTS alt_text VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS family_tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    family_id INTEGER NOT NULL,
    due_date DATE,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS family_action_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    due_date DATE,
    progress INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);-- Add missing columns to family_action_plans table
ALTER TABLE family_action_plans ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE family_action_plans ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE family_action_plans ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE family_action_plans ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE family_action_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE family_action_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Drop existing table if needed (this will delete existing data)
DROP TABLE IF EXISTS family_action_plans CASCADE;

-- Recreate family_action_plans table with correct structure
CREATE TABLE family_action_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    family_id INTEGER NOT NULL,
    due_date DATE,
    progress INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint
ALTER TABLE family_action_plans 
ADD CONSTRAINT fk_family_action_plans_family_id 
FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_family_action_plans_family_id ON family_action_plans(family_id);
CREATE INDEX IF NOT EXISTS idx_family_action_plans_status ON family_action_plans(status);
ALTER TABLE families ADD COLUMN IF NOT EXISTS parent_id INTEGER NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255) NULL;
-- Add unique constraint to prevent a user from being in multiple families
ALTER TABLE family_members ADD CONSTRAINT unique_user_per_family UNIQUE (user_id);

-- Or if you want to allow a user to be in multiple families but not as parent, use this instead:
-- ALTER TABLE family_members ADD CONSTRAINT unique_user_parent UNIQUE (user_id) WHERE role = 'parent';

-- Add unique constraint for parent_id in families table (one parent per family, parent cannot be in multiple families)
ALTER TABLE families ADD CONSTRAINT unique_parent_per_family UNIQUE (parent_id);
-- Discipline Sections Table
CREATE TABLE IF NOT EXISTS discipline_sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discipline Records Table
CREATE TABLE IF NOT EXISTS discipline_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES discipline_sections(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 0,
    type VARCHAR(50) CHECK (type IN ('positive', 'warning', 'penalty', 'suspension')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'appealed')),
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolved_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Permission Requests Table
CREATE TABLE IF NOT EXISTS permission_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Action Plans Table
CREATE TABLE IF NOT EXISTS action_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discipline_record_id INTEGER REFERENCES discipline_records(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    progress INTEGER DEFAULT 0,
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Action Plan Tasks Table
CREATE TABLE IF NOT EXISTS action_plan_tasks (
    id SERIAL PRIMARY KEY,
    action_plan_id INTEGER NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_discipline_records_user_id ON discipline_records(user_id);
CREATE INDEX idx_discipline_records_status ON discipline_records(status);
CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id, session_date);
CREATE INDEX idx_permission_requests_user_status ON permission_requests(user_id, status);
CREATE INDEX idx_action_plans_user_status ON action_plans(user_id, status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_discipline_sections_updated_at BEFORE UPDATE ON discipline_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discipline_records_updated_at BEFORE UPDATE ON discipline_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permission_requests_updated_at BEFORE UPDATE ON permission_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_action_plans_updated_at BEFORE UPDATE ON action_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


ALTER TABLE service_teams ADD COLUMN service_date DATE NULL;

-- YouTube videos table
CREATE TABLE IF NOT EXISTS landing_youtube_videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    youtube_id VARCHAR(100) NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Featured images table
CREATE TABLE IF NOT EXISTS landing_featured_images (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    description TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE archive_sections ADD COLUMN module VARCHAR(50) DEFAULT 'general';
UPDATE archive_sections SET module = 'intercession';

CREATE TABLE IF NOT EXISTS finance_term_settings (
    id SERIAL PRIMARY KEY,
    current_year INTEGER DEFAULT 2026,
    term1_percentage DECIMAL(5,2) DEFAULT 40,
    term2_percentage DECIMAL(5,2) DEFAULT 30,
    term3_percentage DECIMAL(5,2) DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Contributions table
CREATE TABLE IF NOT EXISTS contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    expected_amount DECIMAL(15,2) DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    term INTEGER,
    year INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    term INTEGER,
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gifts table
CREATE TABLE IF NOT EXISTS gifts (
    id SERIAL PRIMARY KEY,
    donor_name VARCHAR(255) NOT NULL,
    commitment_amount DECIMAL(15,2) DEFAULT 0,
    received_amount DECIMAL(15,2) DEFAULT 0,
    gift_type VARCHAR(50),
    date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sponsors table
CREATE TABLE IF NOT EXISTS sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    commitment_amount DECIMAL(15,2) DEFAULT 0,
    received_amount DECIMAL(15,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    receipt_path VARCHAR(500),
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Finance term settings table
CREATE TABLE IF NOT EXISTS finance_term_settings (
    id SERIAL PRIMARY KEY,
    current_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    term1_percentage DECIMAL(5,2) DEFAULT 40,
    term2_percentage DECIMAL(5,2) DEFAULT 30,
    term3_percentage DECIMAL(5,2) DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO finance_term_settings (current_year, term1_percentage, term2_percentage, term3_percentage)
VALUES (EXTRACT(YEAR FROM CURRENT_DATE), 40, 30, 30)
ON CONFLICT (id) DO NOTHING;

-- Add new columns for dynamic terms
ALTER TABLE finance_term_settings 
ADD COLUMN IF NOT EXISTS number_of_terms INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS term_percentages TEXT DEFAULT '[40,30,30]',
ADD COLUMN IF NOT EXISTS term_numbers TEXT DEFAULT '[1,2,3]';

-- Update table structure
ALTER TABLE finance_term_settings 
DROP COLUMN IF EXISTS term1_percentage,
DROP COLUMN IF EXISTS term2_percentage,
DROP COLUMN IF EXISTS term3_percentage;

ALTER TABLE finance_term_settings 
ADD COLUMN IF NOT EXISTS number_of_terms INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS term_percentages TEXT DEFAULT '{"1":40,"2":30,"3":30}',
ADD COLUMN IF NOT EXISTS term_numbers TEXT DEFAULT '[1,2,3]';
-- Drop existing table if needed
DROP TABLE IF EXISTS contributions;

-- Create contributions table with correct columns
CREATE TABLE contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    annual_amount DECIMAL(15,2) DEFAULT 0,
    year INTEGER NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    term INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    payment_date DATE DEFAULT CURRENT_DATE,
    year INTEGER NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'completed',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create finance_term_settings table
CREATE TABLE IF NOT EXISTS finance_term_settings (
    id SERIAL PRIMARY KEY,
    current_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    number_of_terms INTEGER DEFAULT 3,
    term_percentages TEXT DEFAULT '{"1":40,"2":30,"3":30}',
    term_numbers TEXT DEFAULT '[1,2,3]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO finance_term_settings (current_year, number_of_terms, term_percentages, term_numbers)
VALUES (EXTRACT(YEAR FROM CURRENT_DATE), 3, '{"1":40,"2":30,"3":30}', '[1,2,3]')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    annual_amount DECIMAL(15,2) DEFAULT 0,
    year INTEGER NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year)
);

-- Add year column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS year INTEGER;

-- Update existing records with default year
UPDATE payments SET year = EXTRACT(YEAR FROM CURRENT_DATE) WHERE year IS NULL;

-- Make year column not null after update
ALTER TABLE payments ALTER COLUMN year SET NOT NULL;
CREATE TABLE IF NOT EXISTS sponsor_payments (
    id SERIAL PRIMARY KEY,
    sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    commitment_amount DECIMAL(15,2) DEFAULT 0,
    received_amount DECIMAL(15,2) DEFAULT 0,
    fund_type VARCHAR(50) DEFAULT 'one_time',
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to sponsors table
ALTER TABLE sponsors 
ADD COLUMN IF NOT EXISTS fund_type VARCHAR(50) DEFAULT 'one_time',
ADD COLUMN IF NOT EXISTS received_amount DECIMAL(15,2) DEFAULT 0;

-- If you need to recreate the entire sponsors table, run this instead:
DROP TABLE IF EXISTS sponsors CASCADE;

CREATE TABLE sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    commitment_amount DECIMAL(15,2) DEFAULT 0,
    received_amount DECIMAL(15,2) DEFAULT 0,
    fund_type VARCHAR(50) DEFAULT 'one_time',
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sponsor_payments table
CREATE TABLE IF NOT EXISTS sponsor_payments (
    id SERIAL PRIMARY KEY,
    sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Insert missing contribution records for members who have payments
INSERT INTO contributions (user_id, annual_amount, year, created_at, updated_at)
SELECT DISTINCT 
    p.user_id,
    COALESCE(c.annual_amount, 0) as annual_amount,
    p.year,
    NOW(),
    NOW()
FROM payments p
LEFT JOIN contributions c ON c.user_id = p.user_id AND c.year = p.year
WHERE c.id IS NULL
ON CONFLICT (user_id, year) DO NOTHING;

-- Add department column to action_plans table
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS department VARCHAR(50) DEFAULT 'finance';

-- Also add other missing columns if they don't exist
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2) DEFAULT 0;
-- Add missing columns to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_by INTEGER REFERENCES users(id);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_audience VARCHAR(100);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_path VARCHAR(500);

-- Drop and recreate announcements table with all columns
DROP TABLE IF EXISTS announcements CASCADE;

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'active',
    scheduled_date DATE,
    expiry_date DATE,
    target_audience VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal',
    image_path VARCHAR(500),
    created_by INTEGER REFERENCES users(id),
    published_by INTEGER REFERENCES users(id),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_type ON announcements(type);
CREATE INDEX idx_announcements_created_at ON announcements(created_at);
-- Event reports table
CREATE TABLE IF NOT EXISTS event_reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'planned',
    category VARCHAR(100),
    location VARCHAR(255),
    organizer VARCHAR(255),
    participants_count INTEGER DEFAULT 0,
    budget DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report logs table
CREATE TABLE IF NOT EXISTS report_logs (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(100),
    generated_by INTEGER REFERENCES users(id),
    filters JSONB,
    file_path VARCHAR(500),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    session_type VARCHAR(100),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_permissions_user_id ON permissions(user_id);
CREATE INDEX idx_permissions_date ON permissions(date);
CREATE INDEX idx_permissions_status ON permissions(status);

-- Create attendance_records table if not exists
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'present',
    check_in_time TIME,
    check_out_time TIME,
    late_minutes INTEGER DEFAULT 0,
    communicated BOOLEAN DEFAULT FALSE,
    discipline_points INTEGER DEFAULT 0,
    notes TEXT,
    marked_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for attendance_records
CREATE INDEX idx_attendance_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_session_date ON attendance_records(session_date);
CREATE INDEX idx_attendance_session_type ON attendance_records(session_type);

-- Create discipline_records table if not exists
CREATE TABLE IF NOT EXISTS discipline_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    severity VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'active',
    recorded_by INTEGER REFERENCES users(id),
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create action_plans table if not exists
CREATE TABLE IF NOT EXISTS action_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    department VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create action_plan_tasks table if not exists
CREATE TABLE IF NOT EXISTS action_plan_tasks (
    id SERIAL PRIMARY KEY,
    action_plan_id INTEGER NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Add year column to sponsor_payments table
ALTER TABLE sponsor_payments ADD COLUMN year INTEGER;

-- Update existing records to extract year from payment_date
UPDATE sponsor_payments SET year = EXTRACT(YEAR FROM payment_date);

-- Make year column required for future records
ALTER TABLE sponsor_payments ALTER COLUMN year SET NOT NULL;
-- Create sponsors table
CREATE TABLE IF NOT EXISTS sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    commitment_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    fund_type VARCHAR(50) DEFAULT 'one_time',
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for sponsors
CREATE INDEX idx_sponsors_name ON sponsors(name);
CREATE INDEX idx_sponsors_status ON sponsors(status);
CREATE INDEX idx_sponsors_email ON sponsors(email);
-- Create sponsor_payments table
CREATE TABLE IF NOT EXISTS sponsor_payments (
    id SERIAL PRIMARY KEY,
    sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    year INTEGER NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sponsors table if not exists
CREATE TABLE IF NOT EXISTS sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    commitment_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sponsor_payments_sponsor_id ON sponsor_payments(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_payments_year ON sponsor_payments(year);
CREATE INDEX IF NOT EXISTS idx_sponsors_name ON sponsors(name);
CREATE TABLE IF NOT EXISTS role_page_feature (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL,
    page_id INTEGER NOT NULL,
    feature_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Insert User Management page if not exists
INSERT INTO pages (name, display_name, icon, sort_order, is_active) 
VALUES ('user-management', 'User Management', 'fa-users', 1, true)
ON CONFLICT (name) DO NOTHING;

-- Insert the 4 permissions for User Management
INSERT INTO features (page_id, name, display_name) 
SELECT id, 'view', 'View User Management' FROM pages WHERE name = 'user-management'
ON CONFLICT (name, page_id) DO NOTHING;

INSERT INTO features (page_id, name, display_name) 
SELECT id, 'create', 'Add User' FROM pages WHERE name = 'user-management'
ON CONFLICT (name, page_id) DO NOTHING;

INSERT INTO features (page_id, name, display_name) 
SELECT id, 'edit', 'Edit User' FROM pages WHERE name = 'user-management'
ON CONFLICT (name, page_id) DO NOTHING;

INSERT INTO features (page_id, name, display_name) 
SELECT id, 'delete', 'Delete User' FROM pages WHERE name = 'user-management'
ON CONFLICT (name, page_id) DO NOTHING;


-- Run these SQL commands in your SQL editor

-- First, modify the announcements table to add target fields
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_type VARCHAR(50) DEFAULT 'all';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_users TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP NULL;

-- Create announcement_user_reads table to track who has read announcements
CREATE TABLE IF NOT EXISTS announcement_user_reads (
    id BIGSERIAL PRIMARY KEY,
    announcement_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(announcement_id, user_id)
);

-- Create index for performance
CREATE INDEX idx_announcement_user_reads_announcement ON announcement_user_reads(announcement_id);
CREATE INDEX idx_announcement_user_reads_user ON announcement_user_reads(user_id);
CREATE TABLE IF NOT EXISTS announcement_user_reads (
    id BIGSERIAL PRIMARY KEY,
    announcement_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    read_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(announcement_id, user_id)
);














