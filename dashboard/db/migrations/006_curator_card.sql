CREATE TABLE IF NOT EXISTS curator_card (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  status TEXT NOT NULL CHECK (char_length(trim(status)) > 0),
  note TEXT NOT NULL CHECK (char_length(trim(note)) > 0),
  footer TEXT NOT NULL CHECK (char_length(trim(footer)) > 0),
  author TEXT NOT NULL CHECK (char_length(trim(author)) > 0),
  color TEXT NOT NULL CHECK (color ~ '^[0-9a-fA-F]{6}$'),
  image_key TEXT,
  guild_id TEXT CHECK (guild_id IS NULL OR guild_id ~ '^[0-9]{17,20}$'),
  channel_id TEXT CHECK (channel_id IS NULL OR channel_id ~ '^[0-9]{17,20}$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_revisions_resource_type_check') THEN
    ALTER TABLE content_revisions DROP CONSTRAINT content_revisions_resource_type_check;
  END IF;
  ALTER TABLE content_revisions
    ADD CONSTRAINT content_revisions_resource_type_check
    CHECK (resource_type IN ('oracle', 'fragment', 'profile', 'whisper', 'whisper_target', 'admin_config', 'curator_card'));
END $$;

ALTER TABLE content_revisions
  DROP CONSTRAINT IF EXISTS content_revisions_action_check;

ALTER TABLE content_revisions
  ADD CONSTRAINT content_revisions_action_check
  CHECK (action IN ('create', 'update', 'delete', 'restore', 'send'));