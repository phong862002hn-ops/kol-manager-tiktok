# KOL Manager

Internal tool quản lý KOL/KOC và phân tích doanh thu cho shop TikTok Shop.

## Tính năng

- **Quản lý chiến dịch** với 6 tab: Tổng quan / Sản phẩm / KOL / Gửi đơn / Đơn về / Video
- **Import file Excel** từ TikTok Shop Center → auto match KOL ↔ đơn hàng theo username
- **Phân tích doanh thu KOL** với chart (Recharts) — top KOL, tỷ trọng doanh thu, time series 21 ngày
- **Workflow chi phí cast**: Staff đề xuất → Manager duyệt/từ chối → tự động trừ vào lợi nhuận
- **Quản lý KOL cross-campaign**: tag chia loại (VIP, Affiliate, Livestream...), profile follower + giới tính, comment thread
- **Notification real-time**: chuông badge, polling 30s, noti khi có cast cần duyệt / comment mới / đơn gửi đổi status
- **3 lớp bảo vệ dữ liệu**:
  - Restrict quyền (Staff chỉ xóa data mình tạo) + Soft-delete
  - Audit log (ai làm gì, lúc nào, before/after JSON)
  - Auto backup DB hàng ngày 02:00, retention 30 ngày
- **Tổng quan campaign kiểu Meup** với 5 nhóm: progress card, tiến độ theo SP/nhân sự/tag, pipeline, ranking, chart phân tích

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (base-ui)
- **PostgreSQL** + **Prisma**
- **NextAuth.js v4** (credentials, bcrypt)
- **SheetJS (xlsx)** parse Excel
- **Recharts** charts
- **SWR** client-side fetching
- Deploy: **Docker Compose** + **Tailscale** (internal access)

## Cấu trúc

```
app/(dashboard)/
├── _components/          # Shared dashboard-wide
├── campaigns/
│   ├── _components/      # Shared campaigns
│   └── [id]/
│       ├── _components/  # Shared 6 tabs
│       ├── {tab}/
│       │   └── _components/  # Per-tab components
├── kols/ revenue/ users/ tags/ audit/ ...

components/               # Cross-screen
├── ui/                   # shadcn primitives
├── layout/Sidebar.tsx
└── shared/

lib/
├── prisma.ts auth.ts permissions.ts audit.ts notifications.ts
├── excel-parser.ts stats.ts format.ts constants.ts
```

## Setup local dev

```bash
# 1. Postgres local (Docker)
docker run -d --name kol-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=kol_manager \
  -p 5435:5432 postgres:16-alpine

# 2. Install + migrate
npm ci
cp .env.docker.example .env   # sửa lại DATABASE_URL theo port 5435
npx prisma migrate deploy
node prisma/seed.mjs

# 3. Run dev
npm run dev
```

Login: `admin@shop.local` / `admin123`

## Deploy production (Docker + Tailscale)

Xem [`DEPLOY_LAN.md`](./DEPLOY_LAN.md) và [`TAILSCALE_GUIDE.md`](./TAILSCALE_GUIDE.md).

```bash
cp .env.docker.example .env.docker   # đổi POSTGRES_PASSWORD, NEXTAUTH_SECRET, NEXTAUTH_URL
docker compose --env-file .env.docker up -d --build
docker compose exec app node prisma/seed.mjs   # seed admin lần đầu
```

## Doc

- [`DATA_SAFETY.md`](./DATA_SAFETY.md) — 3 lớp bảo vệ data + cách restore
- [`DEPLOY_LAN.md`](./DEPLOY_LAN.md) — Deploy production qua Docker LAN
- [`TAILSCALE_GUIDE.md`](./TAILSCALE_GUIDE.md) — Setup Tailscale internal access

## License

MIT — internal tool, free to fork.
