#!/bin/sh
set -eu

echo "Veritabanı migration işlemleri uygulanıyor..."
pnpm db:migrate
echo "Başlangıç verileri doğrulanıyor..."
pnpm db:seed
exec pnpm dev
