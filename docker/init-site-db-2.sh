#!/bin/sh
set -eu
for database in site_yazici site_atlas site_cornelia site_cornelia_deluxe site_dim_hes; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE $database OWNER $POSTGRES_USER" || true
done
