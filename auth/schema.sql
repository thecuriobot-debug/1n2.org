-- =============================================
-- 1n2.org Modular Auth System - Database Schema
-- =============================================
-- Drop into any MySQL database to add auth.
-- Designed for reuse across MediaLog, Tweetster,
-- Checklister, and any future 1n2.org apps.
-- =============================================

-- Users table: one row per person across all 1n2 apps
CREATE TABLE IF NOT EXISTS auth_users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(100) DEFAULT NULL,
    avatar_url      VARCHAR(500) DEFAULT NULL,
    is_admin        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    last_login_at   TIMESTAMP    NULL,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Login codes: emailed to user, valid for 10 minutes
CREATE TABLE IF NOT EXISTS auth_login_codes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    code            VARCHAR(6) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    used            TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    INDEX idx_user_expires (user_id, expires_at),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sessions: persistent login sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    token           VARCHAR(128) NOT NULL UNIQUE,
    ip_address      VARCHAR(45) DEFAULT NULL,
    user_agent      TEXT DEFAULT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-app user profile data (key-value, flexible)
-- app_name: 'medialog', 'tweetster', 'checklister', etc.
CREATE TABLE IF NOT EXISTS auth_user_profiles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    app_name        VARCHAR(50) NOT NULL,
    profile_key     VARCHAR(100) NOT NULL,
    profile_value   LONGTEXT DEFAULT NULL,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_app_key (user_id, app_name, profile_key),
    INDEX idx_app (app_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rate limiting: prevent brute-force and email spam
CREATE TABLE IF NOT EXISTS auth_rate_limits (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    identifier      VARCHAR(255) NOT NULL,  -- email or IP
    action          VARCHAR(50)  NOT NULL,   -- 'login_attempt', 'code_request'
    attempts        INT NOT NULL DEFAULT 1,
    window_start    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier_action (identifier, action),
    INDEX idx_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
