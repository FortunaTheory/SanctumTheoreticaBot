CREATE TABLE IF NOT EXISTS whisper_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT,
  image_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  CONSTRAINT whisper_entries_content CHECK (
    char_length(trim(COALESCE(text, ''))) > 0 OR image_key IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS whisper_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE CHECK (user_id ~ '^[0-9]{17,20}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
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