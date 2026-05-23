# Deploy KOL Manager lên mạng LAN (Docker)

Hướng dẫn deploy app lên 1 máy host (Mac/Linux) trong văn phòng, nhân sự cùng wifi truy cập qua IP.

## Yêu cầu
- Docker Desktop (đã cài, đang dùng)
- Máy host bật 24/7 (hoặc chấp nhận tắt máy = tắt app)

## Bước 1 — Chuẩn bị file .env

Trong folder `kol-manager/`:

```bash
cp .env.docker.example .env
```

Edit `.env` (file vừa copy):

```bash
# Đổi password DB cho mạnh
POSTGRES_PASSWORD=mat-khau-postgres-rieng-cua-shop

# Sinh secret ngẫu nhiên BẮT BUỘC
NEXTAUTH_SECRET=$(openssl rand -base64 32)   # chạy lệnh này lấy output paste vào

# IP máy host của bạn (lệnh lấy IP):
#   Mac:   ipconfig getifaddr en0
#   Linux: hostname -I
NEXTAUTH_URL=http://192.168.1.50:3000   # ← đổi 192.168.1.50 thành IP máy
```

## Bước 2 — Stop dev server hiện tại (nếu còn chạy)

```bash
# Kill dev server cũ + dừng Postgres container dev nếu có
pkill -f "next dev"
docker stop kol-manager-postgres 2>/dev/null
```

## Bước 3 — Build & start

```bash
cd "/Users/nhibopfam/Documents/quản lý kol koc booking/kol-manager"
docker compose --env-file .env.docker up -d --build
```

Lần đầu build ~3-5 phút (download node:20-alpine, install deps, build Next.js).

Check log:
```bash
docker compose logs -f app
# Khi thấy "✓ Ready" tức là OK. Ctrl+C để thoát log.
```

## Bước 4 — Tạo admin user (lần đầu)

```bash
docker compose exec app node prisma/seed.mjs
```

Output:
```
✓ Seeded admin@shop.local / admin123 (MANAGER)
✓ Seeded staff@shop.local / staff123 (STAFF)
✓ Seeded campaign 'Mùa Hè 2026'
```

## Bước 5 — Test truy cập

Trên máy host:
```bash
open http://localhost:3000
```

Trên máy khác cùng wifi:
```
http://192.168.1.50:3000   ← IP máy host của bạn
```

Login: `admin@shop.local` / `admin123`

⚠ **Đổi password admin ngay** sau khi vào lần đầu (vào `/users`).

---

## Lệnh thường dùng

```bash
# Xem log realtime
docker compose logs -f app

# Restart app (sau khi sửa code: cần build lại)
docker compose --env-file .env.docker up -d --build app

# Stop tất cả (data postgres giữ trong volume)
docker compose down

# Xoá luôn data Postgres (cẩn thận!)
docker compose down -v

# Vào shell container
docker compose exec app sh

# Chạy lệnh prisma trong container
docker compose exec app npx prisma studio  # ko work vì cần port forward
docker compose exec app npx prisma migrate status

# Backup database
docker compose exec postgres pg_dump -U postgres kol_manager > backup-$(date +%Y%m%d).sql

# Restore database
cat backup-20260521.sql | docker compose exec -T postgres psql -U postgres -d kol_manager
```

---

## Lưu ý LAN access

1. **Firewall máy host**: Mac có thể chặn port 3000 từ ngoài.
   - System Settings → Network → Firewall → cho phép Docker hoặc tắt firewall tạm
   - Hoặc System Settings → Privacy & Security → Firewall → Allow Docker

2. **IP máy có thể thay đổi** khi router reset. Nên:
   - Đặt **IP tĩnh** cho máy host trong cài đặt router (assign by MAC address)
   - HOẶC chạy `mDNS` để truy cập bằng tên máy: `http://tên-máy.local:3000`

3. **NEXTAUTH_URL phải đúng** — nếu sai, login redirect lung tung. Đổi xong cần rebuild:
   ```bash
   docker compose --env-file .env.docker up -d --build app
   ```

4. **HTTPS**: hiện chạy HTTP. Nếu muốn HTTPS (vd cho secure cookies), cần thêm reverse proxy (Caddy/Traefik/nginx) — chưa setup trong này.

---

## Troubleshooting

### App báo "Cannot find module" khi start
```bash
docker compose down
docker compose --env-file .env.docker up -d --build --force-recreate
```

### Lỗi migration "table already exists"
```bash
docker compose exec app npx prisma migrate resolve --applied <migration-name>
```

### Postgres không lên
```bash
docker compose logs postgres
# Thường do volume cũ corrupted → xoá volume:
docker compose down -v && docker compose up -d
```

### Nhân sự khác không truy cập được
- Ping IP máy host từ máy nhân sự: `ping 192.168.1.50`
- Nếu ping được nhưng không vào web → firewall máy host chặn
- Nếu ping không được → khác mạng wifi/VLAN, cần admin mạng setup
