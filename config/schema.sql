-- =====================================================
-- config/schema.sql — Ujarma Village Database Schema
-- =====================================================
-- Run this script to initialise the database tables.
-- Usage: mysql -u root -p ujarma_db < config/schema.sql

CREATE DATABASE IF NOT EXISTS ujarma_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ujarma_db;

-- ─────────────────────────────────────────────
-- Table: news
-- Stores village news articles and announcements
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id            INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  slug          VARCHAR(255)  NOT NULL UNIQUE,
  content       LONGTEXT      NOT NULL,
  excerpt       VARCHAR(500)  DEFAULT NULL,
  image         VARCHAR(255)  DEFAULT NULL,
  is_published  TINYINT(1)    NOT NULL DEFAULT 1,
  published_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug         (slug),
  INDEX idx_published    (is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- Table: attractions
-- Stores tourist attractions and points of interest
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attractions (
  id            INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  slug          VARCHAR(255)  NOT NULL UNIQUE,
  description   TEXT          NOT NULL,
  image         VARCHAR(255)  DEFAULT NULL,
  category      VARCHAR(100)  DEFAULT NULL,
  is_featured   TINYINT(1)    NOT NULL DEFAULT 0,
  is_published  TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug         (slug),
  INDEX idx_featured     (is_featured, is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- Table: gallery
-- Stores photo gallery images
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id            INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  image         VARCHAR(255)  NOT NULL,
  category      VARCHAR(100)  DEFAULT 'General',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- Table: admin_users (future use)
-- Stores admin user credentials
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
