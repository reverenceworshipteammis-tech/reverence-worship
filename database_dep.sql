-- ============================================
-- DATABASE CREATION
-- ============================================



-- ============================================
-- ENCODING AND CONFIGURATION
-- ============================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = 'on';
SELECT pg_catalog.set_config('search_path', '', false);

-- ============================================
-- FUNCTION: update_updated_at_column()
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ============================================
-- SEQUENCES
-- ============================================

CREATE SEQUENCE public.users_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.activity_logs_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.error_logs_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.system_settings_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.cache_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.cache_locks_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.sessions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.events_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.pages_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.features_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.role_page_features_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.playlists_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.songs_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.singers_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.photo_gallery_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.groups_table_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.group_members_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.public_board_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.playlist_songs_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.service_teams_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.team_members_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.contribution_settings_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.daily_devotions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.devotion_attempts_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.action_plans_intercession_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.spiritual_archives_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.spiritual_forms_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.devotions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.user_devotion_completions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.forms_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.action_plan_tasks_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.archive_sections_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.archive_pages_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.form_submissions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.action_plans_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.families_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.family_members_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.family_tasks_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.family_action_plans_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.discipline_sections_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.discipline_records_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.attendance_records_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.permission_requests_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.landing_youtube_videos_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.landing_featured_images_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.finance_term_settings_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.payments_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.gifts_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.expenses_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.contributions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.sponsor_payments_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.sponsors_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.announcements_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.event_reports_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.report_logs_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.permissions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.roles_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.role_user_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.announcement_user_reads_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.task_subtasks_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.contribution_histories_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.payment_histories_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.migrations_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.attendance_sessions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.form_result_notification_reads_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- ============================================
-- TABLES
-- ============================================

-- Users Table
CREATE TABLE public.users (
    id integer NOT NULL DEFAULT nextval('public.users_id_seq'::regclass),
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    phone character varying(20),
    date_of_birth date,
    province character varying(100),
    district character varying(100),
    sector character varying(100),
    village character varying(100),
    gender character varying(20),
    marital_status character varying(50),
    membership_type character varying(50) DEFAULT 'Regular'::character varying,
    occupation character varying(100),
    ministry_role character varying(100),
    emergency_contact character varying(20),
    emergency_name character varying(100),
    skills text,
    notes text,
    is_singer boolean DEFAULT false,
    voice_part character varying(50),
    singer_level character varying(50),
    singer_notes text,
    google_id character varying(255),
    avatar character varying(255),
    profile_photo character varying(255),
    last_login_at timestamp without time zone,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Activity Logs Table
CREATE TABLE public.activity_logs (
    id integer NOT NULL DEFAULT nextval('public.activity_logs_id_seq'::regclass),
    user_id integer,
    action character varying(255) NOT NULL,
    description text NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

-- Error Logs Table
CREATE TABLE public.error_logs (
    id integer NOT NULL DEFAULT nextval('public.error_logs_id_seq'::regclass),
    error_type character varying(100) NOT NULL,
    message text NOT NULL,
    file_path character varying(500),
    line_number integer,
    stack_trace text,
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT error_logs_pkey PRIMARY KEY (id)
);

-- System Settings Table
CREATE TABLE public.system_settings (
    id integer NOT NULL DEFAULT nextval('public.system_settings_id_seq'::regclass),
    setting_key character varying(255) NOT NULL,
    setting_value text,
    setting_type character varying(50) DEFAULT 'text'::character varying,
    description text,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT system_settings_pkey PRIMARY KEY (id),
    CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key)
);

-- Cache Table
CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL,
    CONSTRAINT cache_pkey PRIMARY KEY (key)
);

-- Cache Locks Table
CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL,
    CONSTRAINT cache_locks_pkey PRIMARY KEY (key)
);

-- Sessions Table
CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL,
    CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

-- Pages Table
CREATE TABLE public.pages (
    id integer NOT NULL DEFAULT nextval('public.pages_id_seq'::regclass),
    name character varying(100) NOT NULL,
    display_name character varying(255) NOT NULL,
    icon character varying(50) DEFAULT 'fa-folder'::character varying,
    route character varying(255),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pages_pkey PRIMARY KEY (id),
    CONSTRAINT pages_name_key UNIQUE (name)
);

-- Features Table
CREATE TABLE public.features (
    id integer NOT NULL DEFAULT nextval('public.features_id_seq'::regclass),
    page_id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT features_pkey PRIMARY KEY (id),
    CONSTRAINT features_page_id_name_key UNIQUE (page_id, name)
);

-- Role Page Features Table
CREATE TABLE public.role_page_features (
    id integer NOT NULL DEFAULT nextval('public.role_page_features_id_seq'::regclass),
    role_id integer NOT NULL,
    page_id integer NOT NULL,
    feature_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_page_features_pkey PRIMARY KEY (id),
    CONSTRAINT role_page_features_role_id_page_id_feature_id_key UNIQUE (role_id, page_id, feature_id)
);

-- Roles Table
CREATE TABLE public.roles (
    id integer NOT NULL DEFAULT nextval('public.roles_id_seq'::regclass),
    name character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_name_key UNIQUE (name)
);

-- Role User Table
CREATE TABLE public.role_user (
    id integer NOT NULL DEFAULT nextval('public.role_user_id_seq'::regclass),
    role_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT role_user_pkey PRIMARY KEY (id)
);

-- Events Table
CREATE TABLE public.events (
    id integer NOT NULL DEFAULT nextval('public.events_id_seq'::regclass),
    title character varying(255) NOT NULL,
    description text,
    event_type character varying(50) NOT NULL,
    event_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    location character varying(255),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT events_pkey PRIMARY KEY (id)
);

-- Playlists Table
CREATE TABLE public.playlists (
    id integer NOT NULL DEFAULT nextval('public.playlists_id_seq'::regclass),
    title character varying(255) NOT NULL,
    description text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT playlists_pkey PRIMARY KEY (id)
);

-- Songs Table
CREATE TABLE public.songs (
    id integer NOT NULL DEFAULT nextval('public.songs_id_seq'::regclass),
    title character varying(255) NOT NULL,
    artist character varying(255),
    key_signature character varying(10),
    tempo integer,
    lyrics text,
    youtube_link character varying(500),
    assigned_singer character varying(255),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT songs_pkey PRIMARY KEY (id)
);

-- Singers Table
CREATE TABLE public.singers (
    id integer NOT NULL DEFAULT nextval('public.singers_id_seq'::regclass),
    user_id integer,
    name character varying(255) NOT NULL,
    email character varying(255),
    voice_part character varying(50),
    performance_level character varying(50),
    phone character varying(20),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT singers_pkey PRIMARY KEY (id)
);

-- Photo Gallery Table
CREATE TABLE public.photo_gallery (
    id integer NOT NULL DEFAULT nextval('public.photo_gallery_id_seq'::regclass),
    title character varying(255) NOT NULL,
    image_path character varying(500) NOT NULL,
    description text,
    event_date date,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(100),
    tags text,
    alt_text character varying(255),
    CONSTRAINT photo_gallery_pkey PRIMARY KEY (id)
);

-- Groups Table
CREATE TABLE public.groups_table (
    id integer NOT NULL DEFAULT nextval('public.groups_table_id_seq'::regclass),
    name character varying(255) NOT NULL,
    description text,
    leader_id integer,
    member_count integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT groups_table_pkey PRIMARY KEY (id)
);

-- Group Members Table
CREATE TABLE public.group_members (
    id integer NOT NULL DEFAULT nextval('public.group_members_id_seq'::regclass),
    group_id integer,
    user_id integer,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_members_pkey PRIMARY KEY (id),
    CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id)
);

-- Public Board Table
CREATE TABLE public.public_board (
    id integer NOT NULL DEFAULT nextval('public.public_board_id_seq'::regclass),
    title character varying(255) NOT NULL,
    content text NOT NULL,
    is_pinned boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type character varying(255) DEFAULT 'update'::character varying NOT NULL,
    event_date timestamp(0) without time zone,
    is_published boolean DEFAULT false NOT NULL,
    CONSTRAINT public_board_pkey PRIMARY KEY (id)
);

-- Playlist Songs Table
CREATE TABLE public.playlist_songs (
    id integer NOT NULL DEFAULT nextval('public.playlist_songs_id_seq'::regclass),
    playlist_id integer,
    song_id integer,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT playlist_songs_pkey PRIMARY KEY (id),
    CONSTRAINT playlist_songs_playlist_id_song_id_key UNIQUE (playlist_id, song_id)
);

-- Service Teams Table
CREATE TABLE public.service_teams (
    id integer NOT NULL DEFAULT nextval('public.service_teams_id_seq'::regclass),
    service_name character varying(255) NOT NULL,
    number_of_teams integer DEFAULT 1,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    service_date date,
    CONSTRAINT service_teams_pkey PRIMARY KEY (id)
);

-- Team Members Table
CREATE TABLE public.team_members (
    id integer NOT NULL DEFAULT nextval('public.team_members_id_seq'::regclass),
    service_team_id integer,
    team_number integer NOT NULL,
    user_id integer,
    voice_part character varying(50),
    performance_level character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_members_pkey PRIMARY KEY (id)
);

-- Music Repertoire Table
CREATE TABLE public.music_repertoire (
    id integer NOT NULL DEFAULT nextval('public.music_repertoire_id_seq'::regclass),
    title character varying(255) NOT NULL,
    artist character varying(255),
    key_signature character varying(50),
    tempo integer,
    lyrics text,
    youtube_link character varying(500),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT music_repertoire_pkey PRIMARY KEY (id)
);

-- Contribution Settings Table
CREATE TABLE public.contribution_settings (
    id integer NOT NULL DEFAULT nextval('public.contribution_settings_id_seq'::regclass),
    year integer NOT NULL,
    term1_amount numeric(15,2) DEFAULT 0,
    term2_amount numeric(15,2) DEFAULT 0,
    term3_amount numeric(15,2) DEFAULT 0,
    term4_amount numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contribution_settings_pkey PRIMARY KEY (id),
    CONSTRAINT contribution_settings_year_key UNIQUE (year)
);

-- Daily Devotions Table
CREATE TABLE public.daily_devotions (
    id integer NOT NULL DEFAULT nextval('public.daily_devotions_id_seq'::regclass),
    title character varying(255) NOT NULL,
    content text NOT NULL,
    bible_verse character varying(255),
    date date NOT NULL,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT daily_devotions_pkey PRIMARY KEY (id),
    CONSTRAINT daily_devotions_date_key UNIQUE (date)
);

-- Devotion Attempts Table
CREATE TABLE public.devotion_attempts (
    id integer NOT NULL DEFAULT nextval('public.devotion_attempts_id_seq'::regclass),
    user_id integer,
    devotion_id integer,
    completed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT devotion_attempts_pkey PRIMARY KEY (id),
    CONSTRAINT devotion_attempts_user_id_devotion_id_key UNIQUE (user_id, devotion_id)
);

-- Action Plans Intercession Table
CREATE TABLE public.action_plans_intercession (
    id integer NOT NULL DEFAULT nextval('public.action_plans_intercession_id_seq'::regclass),
    title character varying(255) NOT NULL,
    description text,
    due_date date,
    assigned_to integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT action_plans_intercession_pkey PRIMARY KEY (id)
);

-- Spiritual Archives Table
CREATE TABLE public.spiritual_archives (
    id integer NOT NULL DEFAULT nextval('public.spiritual_archives_id_seq'::regclass),
    title character varying(255) NOT NULL,
    content text,
    type character varying(50) DEFAULT 'sermon'::character varying,
    file_path character varying(500),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT spiritual_archives_pkey PRIMARY KEY (id)
);

-- Spiritual Forms Table
CREATE TABLE public.spiritual_forms (
    id integer NOT NULL DEFAULT nextval('public.spiritual_forms_id_seq'::regclass),
    title character varying(255) NOT NULL,
    description text,
    questions jsonb NOT NULL,
    settings jsonb DEFAULT '{"show_score": true, "allow_retake": false, "is_published": false}'::jsonb,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    CONSTRAINT spiritual_forms_pkey PRIMARY KEY (id)
);

-- Devotions Table
CREATE TABLE public.devotions (
    id integer NOT NULL DEFAULT nextval('public.devotions_id_seq'::regclass),
    title character varying(255) NOT NULL,
    content text NOT NULL,
    bible_verse character varying(255),
    date date NOT NULL,
    created_by integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    content_rw text,
    CONSTRAINT devotions_pkey PRIMARY KEY (id)
);

-- User Devotion Completions Table
CREATE TABLE public.user_devotion_completions (
    id integer NOT NULL DEFAULT nextval('public.user_devotion_completions_id_seq'::regclass),
    user_id integer NOT NULL,
    devotion_id integer NOT NULL,
    completed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_devotion_completions_pkey PRIMARY KEY (id),
    CONSTRAINT unique_user_devotion UNIQUE (user_id, devotion_id)
);

-- Forms Table
CREATE TABLE public.forms (
    id integer NOT NULL DEFAULT nextval('public.forms_id_seq'::regclass),
    title character varying(255) NOT NULL,
    description text,
    questions text,
    settings text,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT forms_pkey PRIMARY KEY (id)
);

-- Action Plan Tasks Table
CREATE TABLE public.action_plan_tasks (
    id integer NOT NULL DEFAULT nextval('public.action_plan_tasks_id_seq'::regclass),
    action_plan_id integer NOT NULL,
    name character varying(255) NOT NULL,
    due_date date,
    amount numeric(10,2),
    target character varying(255),
    timeline character varying(100),
    action_details text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT action_plan_tasks_pkey PRIMARY KEY (id)
);

-- Archive Sections Table
CREATE TABLE public.archive_sections (
    id integer NOT NULL DEFAULT nextval('public.archive_sections_id_seq'::regclass),
    name character varying(255) NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    module character varying(50) DEFAULT 'general'::character varying,
    CONSTRAINT archive_sections_pkey PRIMARY KEY (id)
);

-- Archive Pages Table
CREATE TABLE public.archive_pages (
    id integer NOT NULL DEFAULT nextval('public.archive_pages_id_seq'::regclass),
    section_id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    is_published boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT archive_pages_pkey PRIMARY KEY (id)
);

-- Form Submissions Table
CREATE TABLE public.form_submissions (
    id integer NOT NULL DEFAULT nextval('public.form_submissions_id_seq'::regclass),
    form_id integer NOT NULL,
    user_id integer NOT NULL,
    answers text,
    score numeric(5,2),
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    released_at timestamp without time zone,
    is_released boolean DEFAULT false,
    manual_grades text,
    reviewed_by bigint,
    reviewed_at timestamp(0) without time zone,
    CONSTRAINT form_submissions_pkey PRIMARY KEY (id)
);

-- Action Plans Table
CREATE TABLE public.action_plans (
    id integer NOT NULL DEFAULT nextval('public.action_plans_id_seq'::regclass),
    title character varying(255) NOT NULL,
    description text,
    due_date date,
    status character varying(50) DEFAULT 'pending'::character varying,
    user_id integer NOT NULL,
    assigned_to integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    department character varying(50) DEFAULT 'finance'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    progress integer DEFAULT 0,
    budget numeric(15,2) DEFAULT 0,
    CONSTRAINT action_plans_pkey PRIMARY KEY (id)
);

-- Families Table
CREATE TABLE public.families (
    id integer NOT NULL DEFAULT nextval('public.families_id_seq'::regclass),
    name character varying(255) NOT NULL,
    parent_name character varying(255),
    description text,
    motto text,
    meeting_day character varying(50),
    meeting_time time without time zone,
    meeting_location text,
    created_by integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id integer,
    year integer DEFAULT 2026,
    CONSTRAINT families_pkey PRIMARY KEY (id),
    CONSTRAINT unique_parent_per_family UNIQUE (parent_id)
);

-- Family Members Table
CREATE TABLE public.family_members (
    id integer NOT NULL DEFAULT nextval('public.family_members_id_seq'::regclass),
    family_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT family_members_pkey PRIMARY KEY (id),
    CONSTRAINT family_members_family_id_user_id_key UNIQUE (family_id, user_id),
    CONSTRAINT unique_user_per_family UNIQUE (user_id)
);

-- Family Tasks Table
CREATE TABLE public.family_tasks (
    id integer NOT NULL DEFAULT nextval('public.family_tasks_id_seq'::regclass),
    family_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    due_date date,
    assigned_to integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    progress integer DEFAULT 0,
    CONSTRAINT family_tasks_pkey PRIMARY KEY (id)
);

-- Family Action Plans Table
CREATE TABLE public.family_action_plans (
    id integer NOT NULL DEFAULT nextval('public.family_action_plans_id_seq'::regclass),
    title character varying(255) NOT NULL,
    description text,
    family_id integer NOT NULL,
    due_date date,
    progress integer DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT family_action_plans_pkey PRIMARY KEY (id)
);

-- Discipline Sections Table
CREATE TABLE public.discipline_sections (
    id integer NOT NULL DEFAULT nextval('public.discipline_sections_id_seq'::regclass),
    name character varying(255) NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT discipline_sections_pkey PRIMARY KEY (id)
);

-- Discipline Records Table
CREATE TABLE public.discipline_records (
    id integer NOT NULL DEFAULT nextval('public.discipline_records_id_seq'::regclass),
    user_id integer NOT NULL,
    section_id integer,
    title character varying(255) NOT NULL,
    description text,
    points integer DEFAULT 0,
    type character varying(50),
    status character varying(50) DEFAULT 'active'::character varying,
    recorded_by integer NOT NULL,
    resolved_by integer,
    resolved_at timestamp without time zone,
    resolved_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT discipline_records_pkey PRIMARY KEY (id),
    CONSTRAINT discipline_records_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'resolved'::character varying, 'appealed'::character varying])::text[]))),
    CONSTRAINT discipline_records_type_check CHECK (((type)::text = ANY ((ARRAY['positive'::character varying, 'warning'::character varying, 'penalty'::character varying, 'suspension'::character varying])::text[])))
);

-- Attendance Records Table
CREATE TABLE public.attendance_records (
    id integer NOT NULL DEFAULT nextval('public.attendance_records_id_seq'::regclass),
    user_id integer NOT NULL,
    session_date date NOT NULL,
    session_type character varying(100) NOT NULL,
    status character varying(50),
    check_in_time time without time zone,
    check_out_time time without time zone,
    late_minutes integer DEFAULT 0,
    notes text,
    marked_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    communicated boolean DEFAULT false,
    discipline_points integer DEFAULT 0,
    on_time boolean DEFAULT false,
    CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_records_user_id_session_date_session_type_key UNIQUE (user_id, session_date, session_type),
    CONSTRAINT attendance_records_status_check CHECK (((status)::text = ANY ((ARRAY['present'::character varying, 'absent'::character varying, 'late'::character varying, 'excused'::character varying])::text[])))
);

-- Attendance Sessions Table
CREATE TABLE public.attendance_sessions (
    session_date date NOT NULL,
    session_type character varying(100) NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    completed_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_sessions_pkey PRIMARY KEY (session_date, session_type)
);

-- Permission Requests Table
CREATE TABLE public.permission_requests (
    id integer NOT NULL DEFAULT nextval('public.permission_requests_id_seq'::regclass),
    user_id integer NOT NULL,
    type character varying(100) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    rejection_reason text,
    attachment_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT permission_requests_pkey PRIMARY KEY (id),
    CONSTRAINT permission_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::text[])))
);

-- Landing Featured Images Table
CREATE TABLE public.landing_featured_images (
    id integer NOT NULL DEFAULT nextval('public.landing_featured_images_id_seq'::regclass),
    title character varying(255) NOT NULL,
    image_path character varying(500) NOT NULL,
    description text,
    is_published boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_hero boolean DEFAULT false NOT NULL,
    CONSTRAINT landing_featured_images_pkey PRIMARY KEY (id)
);

-- Landing YouTube Videos Table
CREATE TABLE public.landing_youtube_videos (
    id integer NOT NULL DEFAULT nextval('public.landing_youtube_videos_id_seq'::regclass),
    title character varying(255) NOT NULL,
    youtube_id character varying(100) NOT NULL,
    is_published boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT landing_youtube_videos_pkey PRIMARY KEY (id)
);

-- Finance Term Settings Table
CREATE TABLE public.finance_term_settings (
    id integer NOT NULL DEFAULT nextval('public.finance_term_settings_id_seq'::regclass),
    current_year integer DEFAULT 2026,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    number_of_terms integer DEFAULT 3,
    term_percentages text DEFAULT '[40,30,30]'::text,
    term_numbers text DEFAULT '[1,2,3]'::text,
    CONSTRAINT finance_term_settings_pkey PRIMARY KEY (id)
);

-- Payments Table
CREATE TABLE public.payments (
    id integer NOT NULL DEFAULT nextval('public.payments_id_seq'::regclass),
    user_id integer,
    amount numeric(15,2) NOT NULL,
    payment_date date DEFAULT CURRENT_DATE,
    payment_method character varying(50),
    term integer,
    reference_number character varying(100),
    status character varying(50) DEFAULT 'completed'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer NOT NULL,
    CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- Gifts Table
CREATE TABLE public.gifts (
    id integer NOT NULL DEFAULT nextval('public.gifts_id_seq'::regclass),
    donor_name character varying(255) NOT NULL,
    commitment_amount numeric(15,2) DEFAULT 0,
    received_amount numeric(15,2) DEFAULT 0,
    gift_type character varying(50),
    date date,
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT gifts_pkey PRIMARY KEY (id)
);

-- Expenses Table
CREATE TABLE public.expenses (
    id integer NOT NULL DEFAULT nextval('public.expenses_id_seq'::regclass),
    category character varying(100),
    description text,
    amount numeric(15,2) NOT NULL,
    date date DEFAULT CURRENT_DATE,
    status character varying(50) DEFAULT 'pending'::character varying,
    approved_by integer,
    receipt_path character varying(500),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    approver_id_1 integer,
    approver_id_2 integer,
    year integer,
    CONSTRAINT expenses_pkey PRIMARY KEY (id)
);

-- Contributions Table
CREATE TABLE public.contributions (
    id integer NOT NULL DEFAULT nextval('public.contributions_id_seq'::regclass),
    user_id integer NOT NULL,
    annual_amount numeric(15,2) DEFAULT 0,
    year integer NOT NULL,
    notes text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contributions_pkey PRIMARY KEY (id),
    CONSTRAINT contributions_user_id_year_key UNIQUE (user_id, year)
);

-- Sponsor Payments Table
CREATE TABLE public.sponsor_payments (
    id integer NOT NULL DEFAULT nextval('public.sponsor_payments_id_seq'::regclass),
    sponsor_id integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    payment_date date DEFAULT CURRENT_DATE,
    payment_method character varying(50) DEFAULT 'cash'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer,
    month integer,
    CONSTRAINT sponsor_payments_pkey PRIMARY KEY (id)
);

-- Sponsors Table
CREATE TABLE public.sponsors (
    id integer NOT NULL DEFAULT nextval('public.sponsors_id_seq'::regclass),
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    commitment_amount numeric(15,2) DEFAULT 0,
    received_amount numeric(15,2) DEFAULT 0,
    fund_type character varying(50) DEFAULT 'one_time'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer NOT NULL,
    CONSTRAINT sponsors_pkey PRIMARY KEY (id)
);

-- Announcements Table
CREATE TABLE public.announcements (
    id integer NOT NULL DEFAULT nextval('public.announcements_id_seq'::regclass),
    title character varying(255) NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'general'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    scheduled_date date,
    expiry_date date,
    target_audience character varying(100),
    priority character varying(20) DEFAULT 'normal'::character varying,
    image_path character varying(500),
    created_by integer,
    published_by integer,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    target_type character varying(50) DEFAULT 'all'::character varying,
    target_roles text,
    target_users text,
    email_sent boolean DEFAULT false,
    email_sent_at timestamp without time zone,
    CONSTRAINT announcements_pkey PRIMARY KEY (id)
);

-- Event Reports Table
CREATE TABLE public.event_reports (
    id integer NOT NULL DEFAULT nextval('public.event_reports_id_seq'::regclass),
    title character varying(255) NOT NULL,
    description text,
    event_date date,
    start_date date,
    end_date date,
    status character varying(50) DEFAULT 'planned'::character varying,
    category character varying(100),
    location character varying(255),
    organizer character varying(255),
    participants_count integer DEFAULT 0,
    budget numeric(15,2) DEFAULT 0,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT event_reports_pkey PRIMARY KEY (id)
);

-- Report Logs Table
CREATE TABLE public.report_logs (
    id integer NOT NULL DEFAULT nextval('public.report_logs_id_seq'::regclass),
    report_type character varying(100),
    generated_by integer,
    filters jsonb,
    file_path character varying(500),
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT report_logs_pkey PRIMARY KEY (id)
);

-- Permissions Table
CREATE TABLE public.permissions (
    id integer NOT NULL DEFAULT nextval('public.permissions_id_seq'::regclass),
    user_id integer NOT NULL,
    date date NOT NULL,
    session_type character varying(100),
    reason text,
    status character varying(50) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT permissions_pkey PRIMARY KEY (id)
);

-- Announcement User Reads Table
CREATE TABLE public.announcement_user_reads (
    id bigint NOT NULL DEFAULT nextval('public.announcement_user_reads_id_seq'::regclass),
    announcement_id bigint NOT NULL,
    user_id bigint NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT announcement_user_reads_pkey PRIMARY KEY (id),
    CONSTRAINT announcement_user_reads_announcement_id_user_id_key UNIQUE (announcement_id, user_id)
);

-- Task Subtasks Table
CREATE TABLE public.task_subtasks (
    id bigint NOT NULL DEFAULT nextval('public.task_subtasks_id_seq'::regclass),
    task_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT task_subtasks_pkey PRIMARY KEY (id)
);

-- Contribution Histories Table
CREATE TABLE public.contribution_histories (
    id integer NOT NULL DEFAULT nextval('public.contribution_histories_id_seq'::regclass),
    contribution_id integer NOT NULL,
    user_id integer NOT NULL,
    old_amount numeric(15,2) DEFAULT 0,
    new_amount numeric(15,2) DEFAULT 0,
    year integer NOT NULL,
    notes text,
    edited_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contribution_histories_pkey PRIMARY KEY (id)
);

-- Payment Histories Table
CREATE TABLE public.payment_histories (
    id integer NOT NULL DEFAULT nextval('public.payment_histories_id_seq'::regclass),
    payment_id integer NOT NULL,
    user_id integer NOT NULL,
    old_term integer,
    new_term integer,
    old_amount numeric(15,2) DEFAULT 0,
    new_amount numeric(15,2) DEFAULT 0,
    old_payment_method character varying(50),
    new_payment_method character varying(50),
    old_payment_date date,
    new_payment_date date,
    notes text,
    edited_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payment_histories_pkey PRIMARY KEY (id)
);

-- Migrations Table
CREATE TABLE public.migrations (
    id integer NOT NULL DEFAULT nextval('public.migrations_id_seq'::regclass),
    migration character varying(255) NOT NULL,
    batch integer NOT NULL,
    CONSTRAINT migrations_pkey PRIMARY KEY (id)
);

-- Form Result Notification Reads Table
CREATE TABLE public.form_result_notification_reads (
    id bigint NOT NULL DEFAULT nextval('public.form_result_notification_reads_id_seq'::regclass),
    submission_id bigint NOT NULL,
    user_id bigint NOT NULL,
    read_at timestamp(0) without time zone NOT NULL,
    CONSTRAINT form_result_notification_reads_pkey PRIMARY KEY (id),
    CONSTRAINT form_result_notification_reads_submission_id_user_id_unique UNIQUE (submission_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);
CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);
CREATE INDEX features_page_id_fkey ON public.features USING btree (page_id);
CREATE INDEX idx_action_plans_user_status ON public.action_plans USING btree (user_id, status);
CREATE INDEX idx_announcement_user_reads_announcement ON public.announcement_user_reads USING btree (announcement_id);
CREATE INDEX idx_announcement_user_reads_user ON public.announcement_user_reads USING btree (user_id);
CREATE INDEX idx_announcements_created_at ON public.announcements USING btree (created_at);
CREATE INDEX idx_announcements_status ON public.announcements USING btree (status);
CREATE INDEX idx_announcements_type ON public.announcements USING btree (type);
CREATE INDEX idx_archive_pages_is_published ON public.archive_pages USING btree (is_published);
CREATE INDEX idx_archive_pages_section_id ON public.archive_pages USING btree (section_id);
CREATE INDEX idx_attendance_records_user_date ON public.attendance_records USING btree (user_id, session_date);
CREATE INDEX idx_attendance_session_date ON public.attendance_records USING btree (session_date);
CREATE INDEX idx_attendance_session_type ON public.attendance_records USING btree (session_type);
CREATE INDEX idx_attendance_user_id ON public.attendance_records USING btree (user_id);
CREATE INDEX idx_contribution_histories_contribution_id ON public.contribution_histories USING btree (contribution_id);
CREATE INDEX idx_contribution_histories_user_id ON public.contribution_histories USING btree (user_id);
CREATE INDEX idx_devotions_date ON public.devotions USING btree (date);
CREATE INDEX idx_devotions_is_active ON public.devotions USING btree (is_active);
CREATE INDEX idx_discipline_records_status ON public.discipline_records USING btree (status);
CREATE INDEX idx_discipline_records_user_id ON public.discipline_records USING btree (user_id);
CREATE INDEX idx_families_year ON public.families USING btree (year);
CREATE INDEX idx_family_action_plans_family_id ON public.family_action_plans USING btree (family_id);
CREATE INDEX idx_family_action_plans_status ON public.family_action_plans USING btree (status);
CREATE INDEX idx_payment_histories_payment_id ON public.payment_histories USING btree (payment_id);
CREATE INDEX idx_payment_histories_user_id ON public.payment_histories USING btree (user_id);
CREATE INDEX idx_permission_requests_user_status ON public.permission_requests USING btree (user_id, status);
CREATE INDEX idx_permissions_date ON public.permissions USING btree (date);
CREATE INDEX idx_permissions_status ON public.permissions USING btree (status);
CREATE INDEX idx_permissions_user_id ON public.permissions USING btree (user_id);
CREATE INDEX idx_sponsor_payments_month ON public.sponsor_payments USING btree (month);
CREATE INDEX idx_sponsor_payments_payment_date ON public.sponsor_payments USING btree (payment_date);
CREATE INDEX idx_sponsor_payments_year ON public.sponsor_payments USING btree (year);
CREATE INDEX idx_task_subtasks_task_id ON public.task_subtasks USING btree (task_id);
CREATE INDEX idx_user_devotion_completions_devotion_id ON public.user_devotion_completions USING btree (devotion_id);
CREATE INDEX idx_user_devotion_completions_user_id ON public.user_devotion_completions USING btree (user_id);
CREATE INDEX expenses_approver_id_1_index ON public.expenses USING btree (approver_id_1);
CREATE INDEX expenses_approver_id_2_index ON public.expenses USING btree (approver_id_2);

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Activity Logs
ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Error Logs
ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- System Settings
ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Features
ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;

-- Role Page Features
ALTER TABLE ONLY public.role_page_features
    ADD CONSTRAINT role_page_features_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.role_page_features
    ADD CONSTRAINT role_page_features_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.role_page_features
    ADD CONSTRAINT role_page_features_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE CASCADE;

-- Role User
ALTER TABLE ONLY public.role_user
    ADD CONSTRAINT role_user_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.role_user
    ADD CONSTRAINT role_user_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Events
ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Playlists
ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Songs
ALTER TABLE ONLY public.songs
    ADD CONSTRAINT songs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Singers
ALTER TABLE ONLY public.singers
    ADD CONSTRAINT singers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.singers
    ADD CONSTRAINT singers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Photo Gallery
ALTER TABLE ONLY public.photo_gallery
    ADD CONSTRAINT photo_gallery_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Groups Table
ALTER TABLE ONLY public.groups_table
    ADD CONSTRAINT groups_table_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.groups_table
    ADD CONSTRAINT groups_table_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Group Members
ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups_table(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Public Board
ALTER TABLE ONLY public.public_board
    ADD CONSTRAINT public_board_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Playlist Songs
ALTER TABLE ONLY public.playlist_songs
    ADD CONSTRAINT playlist_songs_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.playlist_songs
    ADD CONSTRAINT playlist_songs_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;

-- Service Teams
ALTER TABLE ONLY public.service_teams
    ADD CONSTRAINT service_teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Team Members
ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_service_team_id_fkey FOREIGN KEY (service_team_id) REFERENCES public.service_teams(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Music Repertoire
ALTER TABLE ONLY public.music_repertoire
    ADD CONSTRAINT music_repertoire_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Contribution Settings
ALTER TABLE ONLY public.contribution_settings
    ADD CONSTRAINT contribution_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);

-- Daily Devotions
ALTER TABLE ONLY public.daily_devotions
    ADD CONSTRAINT daily_devotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Devotion Attempts
ALTER TABLE ONLY public.devotion_attempts
    ADD CONSTRAINT devotion_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.devotion_attempts
    ADD CONSTRAINT devotion_attempts_devotion_id_fkey FOREIGN KEY (devotion_id) REFERENCES public.daily_devotions(id) ON DELETE CASCADE;

-- Action Plans Intercession
ALTER TABLE ONLY public.action_plans_intercession
    ADD CONSTRAINT action_plans_intercession_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);
ALTER TABLE ONLY public.action_plans_intercession
    ADD CONSTRAINT action_plans_intercession_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Spiritual Archives
ALTER TABLE ONLY public.spiritual_archives
    ADD CONSTRAINT spiritual_archives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Spiritual Forms
ALTER TABLE ONLY public.spiritual_forms
    ADD CONSTRAINT spiritual_forms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- User Devotion Completions
ALTER TABLE ONLY public.user_devotion_completions
    ADD CONSTRAINT user_devotion_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_devotion_completions
    ADD CONSTRAINT user_devotion_completions_devotion_id_fkey FOREIGN KEY (devotion_id) REFERENCES public.devotions(id) ON DELETE CASCADE;

-- Forms
ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Action Plan Tasks
ALTER TABLE ONLY public.action_plan_tasks
    ADD CONSTRAINT action_plan_tasks_action_plan_id_fkey FOREIGN KEY (action_plan_id) REFERENCES public.action_plans(id) ON DELETE CASCADE;

-- Archive Pages
ALTER TABLE ONLY public.archive_pages
    ADD CONSTRAINT archive_pages_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.archive_sections(id) ON DELETE CASCADE;

-- Form Submissions
ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_reviewed_by_foreign FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Action Plans
ALTER TABLE ONLY public.action_plans
    ADD CONSTRAINT fk_action_plans_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.action_plans
    ADD CONSTRAINT action_plans_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);
ALTER TABLE ONLY public.action_plans
    ADD CONSTRAINT action_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Family Members
ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Family Tasks
ALTER TABLE ONLY public.family_tasks
    ADD CONSTRAINT family_tasks_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;

-- Family Action Plans
ALTER TABLE ONLY public.family_action_plans
    ADD CONSTRAINT fk_family_action_plans_family_id FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;

-- Discipline Records
ALTER TABLE ONLY public.discipline_records
    ADD CONSTRAINT discipline_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.discipline_records
    ADD CONSTRAINT discipline_records_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.discipline_sections(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.discipline_records
    ADD CONSTRAINT discipline_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.discipline_records
    ADD CONSTRAINT discipline_records_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);

-- Attendance Records
ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id);

-- Attendance Sessions
ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);

-- Permission Requests
ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT permission_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.permission_requests
    ADD CONSTRAINT permission_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

-- Finance Term Settings
ALTER TABLE ONLY public.finance_term_settings
    ADD CONSTRAINT finance_term_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Payments
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Gifts
ALTER TABLE ONLY public.gifts
    ADD CONSTRAINT gifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Expenses
ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_approver_id_1_foreign FOREIGN KEY (approver_id_1) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_approver_id_2_foreign FOREIGN KEY (approver_id_2) REFERENCES public.users(id) ON DELETE SET NULL;

-- Contributions
ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Sponsor Payments
ALTER TABLE ONLY public.sponsor_payments
    ADD CONSTRAINT sponsor_payments_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sponsor_payments
    ADD CONSTRAINT sponsor_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Sponsors
ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Announcements
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.users(id);

-- Event Reports
ALTER TABLE ONLY public.event_reports
    ADD CONSTRAINT event_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Report Logs
ALTER TABLE ONLY public.report_logs
    ADD CONSTRAINT report_logs_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id);

-- Permissions
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Announcement User Reads
ALTER TABLE ONLY public.announcement_user_reads
    ADD CONSTRAINT announcement_user_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.announcement_user_reads
    ADD CONSTRAINT announcement_user_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Task Subtasks
ALTER TABLE ONLY public.task_subtasks
    ADD CONSTRAINT task_subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.family_tasks(id) ON DELETE CASCADE;

-- Contribution Histories
ALTER TABLE ONLY public.contribution_histories
    ADD CONSTRAINT contribution_histories_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES public.contributions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.contribution_histories
    ADD CONSTRAINT contribution_histories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.contribution_histories
    ADD CONSTRAINT contribution_histories_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Payment Histories
ALTER TABLE ONLY public.payment_histories
    ADD CONSTRAINT payment_histories_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payment_histories
    ADD CONSTRAINT payment_histories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payment_histories
    ADD CONSTRAINT payment_histories_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Form Result Notification Reads
ALTER TABLE ONLY public.form_result_notification_reads
    ADD CONSTRAINT form_result_notification_reads_submission_id_foreign FOREIGN KEY (submission_id) REFERENCES public.form_submissions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.form_result_notification_reads
    ADD CONSTRAINT form_result_notification_reads_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_action_plans_updated_at BEFORE UPDATE ON public.action_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_discipline_records_updated_at BEFORE UPDATE ON public.discipline_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_discipline_sections_updated_at BEFORE UPDATE ON public.discipline_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_permission_requests_updated_at BEFORE UPDATE ON public.permission_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SEQUENCE RESET VALUES (Initialize to 1)
-- ============================================

SELECT pg_catalog.setval('public.users_id_seq', 1, false);
SELECT pg_catalog.setval('public.activity_logs_id_seq', 1, false);
SELECT pg_catalog.setval('public.error_logs_id_seq', 1, false);
SELECT pg_catalog.setval('public.system_settings_id_seq', 1, false);
SELECT pg_catalog.setval('public.events_id_seq', 1, false);
SELECT pg_catalog.setval('public.pages_id_seq', 1, false);
SELECT pg_catalog.setval('public.features_id_seq', 1, false);
SELECT pg_catalog.setval('public.role_page_features_id_seq', 1, false);
SELECT pg_catalog.setval('public.playlists_id_seq', 1, false);
SELECT pg_catalog.setval('public.songs_id_seq', 1, false);
SELECT pg_catalog.setval('public.singers_id_seq', 1, false);
SELECT pg_catalog.setval('public.photo_gallery_id_seq', 1, false);
SELECT pg_catalog.setval('public.groups_table_id_seq', 1, false);
SELECT pg_catalog.setval('public.group_members_id_seq', 1, false);
SELECT pg_catalog.setval('public.public_board_id_seq', 1, false);
SELECT pg_catalog.setval('public.playlist_songs_id_seq', 1, false);
SELECT pg_catalog.setval('public.service_teams_id_seq', 1, false);
SELECT pg_catalog.setval('public.team_members_id_seq', 1, false);
SELECT pg_catalog.setval('public.contribution_settings_id_seq', 1, false);
SELECT pg_catalog.setval('public.daily_devotions_id_seq', 1, false);
SELECT pg_catalog.setval('public.devotion_attempts_id_seq', 1, false);
SELECT pg_catalog.setval('public.action_plans_intercession_id_seq', 1, false);
SELECT pg_catalog.setval('public.spiritual_archives_id_seq', 1, false);
SELECT pg_catalog.setval('public.spiritual_forms_id_seq', 1, false);
SELECT pg_catalog.setval('public.devotions_id_seq', 1, false);
SELECT pg_catalog.setval('public.user_devotion_completions_id_seq', 1, false);
SELECT pg_catalog.setval('public.forms_id_seq', 1, false);
SELECT pg_catalog.setval('public.action_plan_tasks_id_seq', 1, false);
SELECT pg_catalog.setval('public.archive_sections_id_seq', 1, false);
SELECT pg_catalog.setval('public.archive_pages_id_seq', 1, false);
SELECT pg_catalog.setval('public.form_submissions_id_seq', 1, false);
SELECT pg_catalog.setval('public.action_plans_id_seq', 1, false);
SELECT pg_catalog.setval('public.families_id_seq', 1, false);
SELECT pg_catalog.setval('public.family_members_id_seq', 1, false);
SELECT pg_catalog.setval('public.family_tasks_id_seq', 1, false);
SELECT pg_catalog.setval('public.family_action_plans_id_seq', 1, false);
SELECT pg_catalog.setval('public.discipline_sections_id_seq', 1, false);
SELECT pg_catalog.setval('public.discipline_records_id_seq', 1, false);
SELECT pg_catalog.setval('public.attendance_records_id_seq', 1, false);
SELECT pg_catalog.setval('public.permission_requests_id_seq', 1, false);
SELECT pg_catalog.setval('public.landing_youtube_videos_id_seq', 1, false);
SELECT pg_catalog.setval('public.landing_featured_images_id_seq', 1, false);
SELECT pg_catalog.setval('public.finance_term_settings_id_seq', 1, false);
SELECT pg_catalog.setval('public.payments_id_seq', 1, false);
SELECT pg_catalog.setval('public.gifts_id_seq', 1, false);
SELECT pg_catalog.setval('public.expenses_id_seq', 1, false);
SELECT pg_catalog.setval('public.contributions_id_seq', 1, false);
SELECT pg_catalog.setval('public.sponsor_payments_id_seq', 1, false);
SELECT pg_catalog.setval('public.sponsors_id_seq', 1, false);
SELECT pg_catalog.setval('public.announcements_id_seq', 1, false);
SELECT pg_catalog.setval('public.event_reports_id_seq', 1, false);
SELECT pg_catalog.setval('public.report_logs_id_seq', 1, false);
SELECT pg_catalog.setval('public.permissions_id_seq', 1, false);
SELECT pg_catalog.setval('public.roles_id_seq', 1, false);
SELECT pg_catalog.setval('public.role_user_id_seq', 1, false);
SELECT pg_catalog.setval('public.announcement_user_reads_id_seq', 1, false);
SELECT pg_catalog.setval('public.task_subtasks_id_seq', 1, false);
SELECT pg_catalog.setval('public.contribution_histories_id_seq', 1, false);
SELECT pg_catalog.setval('public.payment_histories_id_seq', 1, false);
SELECT pg_catalog.setval('public.migrations_id_seq', 1, false);
SELECT pg_catalog.setval('public.form_result_notification_reads_id_seq', 1, false);
SELECT pg_catalog.setval('public.music_repertoire_id_seq', 1, false);
SELECT pg_catalog.setval('public.cache_id_seq', 1, false);
SELECT pg_catalog.setval('public.cache_locks_id_seq', 1, false);
SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);
SELECT pg_catalog.setval('public.attendance_sessions_id_seq', 1, false);

-- ============================================
-- FINAL OUTPUT
-- ============================================

\echo 'Database reverence_worship created successfully with all tables!'