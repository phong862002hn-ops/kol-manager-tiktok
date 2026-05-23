#!/bin/sh
set -e

echo "▶ Chạy migrations..."
npx prisma migrate deploy

echo "▶ Start app: $@"
exec "$@"
