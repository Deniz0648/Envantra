CREATE TABLE IF NOT EXISTS unmatched_ad_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_guid text NOT NULL UNIQUE,
  object_type text NOT NULL,
  name text NOT NULL,
  distinguished_name text NOT NULL,
  reason text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_site_id uuid REFERENCES sites(id),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS unmatched_ad_resolved_idx ON unmatched_ad_records(is_resolved);
