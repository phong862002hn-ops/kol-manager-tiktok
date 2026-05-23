#!/bin/sh
# Backup PostgreSQL database. Chạy hàng ngày qua cron.
# Lưu file vào /backups/ + xóa file cũ hơn BACKUP_KEEP_DAYS ngày.
set -e

TS=$(date +%Y%m%d-%H%M%S)
FILE="/backups/kol_manager-${TS}.sql.gz"

echo "[backup] ${TS} bắt đầu dump..."
pg_dump --no-owner --no-acl --clean --if-exists "$PGDATABASE" | gzip > "$FILE"
SIZE=$(du -h "$FILE" | cut -f1)
echo "[backup] ✓ Saved $FILE ($SIZE)"

# Xóa file cũ
KEEP=${BACKUP_KEEP_DAYS:-30}
echo "[backup] Xóa file cũ hơn $KEEP ngày..."
find /backups -name "kol_manager-*.sql.gz" -type f -mtime "+$KEEP" -print -delete || true
echo "[backup] Done."
