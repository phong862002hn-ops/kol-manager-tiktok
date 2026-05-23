# Bảo vệ dữ liệu KOL Manager — 3 lớp phòng vệ

## Lớp 1 — Soft-delete + Restrict quyền

### Hành vi mới
- **Xóa giờ là "soft-delete"**: set `deletedAt = NOW()`, KHÔNG xóa khỏi DB. Có thể khôi phục bằng cách clear field này.
- **Phân quyền xóa**:
  - **Manager**: xóa bất kỳ campaign/KOL/SP/đơn gửi/import nào.
  - **Staff**: chỉ xóa được data **mình tự tạo** (tracking qua `createdById`).
  - Data cũ không có `createdById` → chỉ Manager xóa được.
- **Import Excel chỉ Manager mới xóa được** (vì xóa = mất hết doanh thu).

### Khôi phục dữ liệu đã xóa
Tạm thời cần chạy SQL trong DB:
```bash
docker exec -it kol-manager-db psql -U postgres -d kol_manager

# Khôi phục campaign
UPDATE "Campaign" SET "deletedAt" = NULL WHERE id = '<campaign-id>';

# Khôi phục KOL
UPDATE "CampaignKol" SET "deletedAt" = NULL WHERE id = '<kol-id>';

# Khôi phục Import (kèm tất cả TiktokOrder của nó vẫn còn nguyên)
UPDATE "ExcelImport" SET "deletedAt" = NULL WHERE id = '<import-id>';
```

ID có thể lấy từ **trang `/audit`** — mỗi log DELETE có `entityId` ngay trong dialog chi tiết.

## Lớp 2 — Audit log

Mỗi thao tác CREATE / UPDATE / DELETE đều được ghi vào bảng `AuditLog` gồm:
- Ai (userId + email + name snapshot)
- Khi nào (`createdAt`)
- Làm gì (`action`: CREATE/UPDATE/DELETE/RESTORE)
- Trên đối tượng nào (`entity` + `entityId` + `entityName`)
- Data **trước** khi đổi (`beforeJson`) — dùng để khôi phục manual
- Data **sau** khi đổi (`afterJson`)

### Truy cập
- Manager → sidebar **📜 Lịch sử hoạt động** (`/audit`)
- Filter theo loại đối tượng / hành động / người làm
- Click 1 dòng → xem JSON `before` (đỏ) vs `after` (xanh)

### Khi nào dùng
- Nhân sự báo "tôi không xóa", nhưng data biến mất → check audit
- Cần biết ai đổi giá trị nào (vd ai sửa cast amount từ 1tr xuống 500k)
- Khi recovery: lấy `beforeJson` của log DELETE → restore manual qua DB

## Lớp 3 — Auto backup DB hàng ngày

### Cấu hình
- Container **`kol-manager-backup`** chạy nhỏ gọn (postgres:16-alpine + busybox cron)
- Schedule: **02:00 hàng ngày** (giờ Mac host)
- Output: `./backups/kol_manager-YYYYMMDD-HHMMSS.sql.gz` (gzip compressed)
- Retention: giữ **30 file gần nhất**, tự xóa file cũ hơn

### Verify
```bash
# Xem cron entry
docker exec kol-manager-backup cat /etc/crontabs/root

# Xem các backup hiện có
ls -lh "/Users/nhibopfam/Documents/quản lý kol koc booking/kol-manager/backups/"

# Chạy backup manual ngay
docker exec kol-manager-backup /usr/local/bin/backup.sh

# Xem log backup
docker logs kol-manager-backup --tail 50
```

### Restore từ backup
```bash
cd "/Users/nhibopfam/Documents/quản lý kol koc booking/kol-manager"

# 1. Stop app để tránh ghi đè
docker compose stop app

# 2. Drop DB cũ + tạo lại
docker exec kol-manager-db psql -U postgres -c "DROP DATABASE IF EXISTS kol_manager;"
docker exec kol-manager-db psql -U postgres -c "CREATE DATABASE kol_manager;"

# 3. Restore từ file (đổi tên file tùy theo backup muốn dùng)
gunzip -c backups/kol_manager-20260522-091631.sql.gz | \
  docker exec -i kol-manager-db psql -U postgres -d kol_manager

# 4. Start lại app
docker compose --env-file .env.docker up -d app
```

### Backup ra cloud (khuyến nghị)
Thư mục `./backups/` chỉ trên máy host. Nếu máy hỏng = mất luôn. Để an toàn hơn:

```bash
# Mac có iCloud: symlink backups vào iCloud Drive
ln -s "$HOME/Library/Mobile Documents/com~apple~CloudDocs/kol-backups" backups

# Hoặc rsync nightly lên Google Drive (cài rclone trước)
# Thêm 1 cronjob trong launchd / crontab Mac:
# 0 3 * * * rclone copy "/path/to/backups" gdrive:kol-backups
```

## Summary — bạn cần biết gì

1. **Staff không thể xóa data của người khác nữa** — chỉ Manager xóa được tất.
2. **Xóa không mất** — data soft-delete, khôi phục được qua SQL.
3. **Mọi thao tác có dấu vết** — xem ở `/audit`, biết ai sửa/xóa gì lúc nào.
4. **Backup tự động lúc 2h sáng mỗi ngày** — file `.sql.gz` trong `./backups/`, giữ 30 ngày.
5. **Đầu mỗi tuần backup ra cloud** (manual hoặc setup rclone) cho an toàn.

## Lưu ý
- Audit log không log query GET/READ → chỉ ghi mutation.
- Cast cost approve/reject chưa được log audit (chỉ log qua workflow status). Sẽ thêm sau nếu cần.
- Soft-delete chưa có UI "Khôi phục" — phải SQL manual. Sẽ thêm sau nếu cần.
- Backup KHÔNG bao gồm: file Excel gốc bạn upload (chỉ data đã parse vào DB).
