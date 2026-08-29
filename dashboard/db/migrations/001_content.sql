CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS oracle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aspect TEXT NOT NULL CHECK (aspect IN ('archive', 'lucid', 'enigma')),
  text TEXT NOT NULL CHECK (char_length(trim(text)) > 0),
  image_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS fragment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  text TEXT NOT NULL CHECK (char_length(trim(text)) > 0),
  image_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS profile_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id TEXT,
  priority INTEGER NOT NULL DEFAULT 10,
  author TEXT NOT NULL CHECK (char_length(trim(author)) > 0),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  status TEXT NOT NULL CHECK (char_length(trim(status)) > 0),
  note TEXT NOT NULL CHECK (char_length(trim(note)) > 0),
  footer TEXT NOT NULL CHECK (char_length(trim(footer)) > 0),
  color TEXT NOT NULL CHECK (color ~ '^[0-9a-fA-F]{6}$'),
  image_key TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_cards_single_default
  ON profile_cards (is_default)
  WHERE is_default;

CREATE TABLE IF NOT EXISTS content_revisions (
  id BIGSERIAL PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('oracle', 'fragment', 'profile')),
  resource_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  previous_value JSONB,
  next_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_revisions_resource
  ON content_revisions (resource_type, resource_id, created_at DESC);