CREATE TABLE IF NOT EXISTS curator_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  image_key TEXT,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS curator_personas_single_default
  ON curator_personas (is_default)
  WHERE is_default;

-- Initial default persona: Die Kuratorin
INSERT INTO curator_personas (name, description, is_default, updated_by)
SELECT 'Die Kuratorin', 'Stimme des Sanctum Theoretica. Das Archiv ist wach.', true, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM curator_personas WHERE is_default = true
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_revisions_resource_type_check') THEN
    ALTER TABLE content_revisions DROP CONSTRAINT content_revisions_resource_type_check;
  END IF;
  ALTER TABLE content_revisions
    ADD CONSTRAINT content_revisions_resource_type_check
    CHECK (resource_type IN ('oracle', 'fragment', 'profile', 'whisper', 'whisper_target', 'admin_config', 'curator_card', 'curator_chat', 'curator_persona'));
END $$;
