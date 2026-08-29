ALTER TABLE bot_config
  DROP CONSTRAINT IF EXISTS bot_config_whisper_hours_valid;

ALTER TABLE bot_config
  ADD CONSTRAINT bot_config_whisper_hours_valid
  CHECK (whisper_min_hours <= whisper_max_hours);

CREATE INDEX IF NOT EXISTS content_revisions_created_at
  ON content_revisions (created_at DESC, id DESC);