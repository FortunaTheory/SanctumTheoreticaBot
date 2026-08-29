ALTER TABLE profile_cards
  ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profile_cards_unique_user
  ON profile_cards (user_id)
  WHERE user_id IS NOT NULL;