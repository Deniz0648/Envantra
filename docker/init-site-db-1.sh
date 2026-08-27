#!/bin/sh
set -eu
for database in site_maslak site_ddc site_telcubuk site_dna site_dilerlimani; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE $database OWNER $POSTGRES_USER" || true
done
