CREATE TABLE IF NOT EXISTS bot_config (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  guild_id TEXT CHECK (guild_id IS NULL OR guild_id ~ '^[0-9]{17,20}$'),
  mod_role_ids TEXT[] NOT NULL DEFAULT '{}',
  dashboard_allowed_user_ids TEXT[] NOT NULL DEFAULT '{}',
  whisper_channel_id TEXT CHECK (whisper_channel_id IS NULL OR whisper_channel_id ~ '^[0-9]{17,20}$'),
  whisper_min_hours NUMERIC NOT NULL DEFAULT 24 CHECK (whisper_min_hours > 0),
  whisper_max_hours NUMERIC NOT NULL DEFAULT 32 CHECK (whisper_max_hours > 0),
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
    CHECK (resource_type IN ('oracle', 'fragment', 'profile', 'whisper', 'whisper_target', 'admin_config'));
END $$;