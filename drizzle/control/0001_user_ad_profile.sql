ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ad_profile_id uuid;
DO $$ BEGIN
  ALTER TABLE app_users ADD CONSTRAINT app_users_ad_profile_id_fk FOREIGN KEY (ad_profile_id) REFERENCES ad_profiles(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_ad_profile_id_uq ON app_users(ad_profile_id) WHERE ad_profile_id IS NOT NULL;
