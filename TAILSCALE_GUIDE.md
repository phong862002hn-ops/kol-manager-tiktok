# KOL Manager qua Tailscale — Hướng dẫn

## ✅ Setup đã hoàn tất

App đang chạy production trong Docker, proxy qua Tailscale.

| | |
|---|---|
| **URL nhân sự dùng** | `http://<your-machine>.<your-tailnet>.ts.net` |
| **URL ngắn (cùng tailnet)** | `http://kol-server` |
| **Tailnet ID** | `<your-tailnet>.ts.net` |
| **Server hostname** | `kol-server` |
| **Server IP tailnet** | `100.65.112.4` |

## 👥 Mời nhân sự (admin Tailscale làm)

1. Vào https://login.tailscale.com/admin/users
2. Bấm **Invite users** → nhập email nhân sự → Send
3. Nhân sự nhận mail → click link → tạo account Tailscale (miễn phí với email công ty hoặc Google)

## 📱 Nhân sự setup (1 lần duy nhất)

1. Tải Tailscale:
   - **Mac**: App Store search "Tailscale"
   - **Windows**: https://tailscale.com/download/windows
   - **iPhone/Android**: App Store / Play Store search "Tailscale"
2. Mở Tailscale app → **Log in** → đăng nhập bằng email vừa được invite
3. Khi thấy "Connected" → mở browser: **http://<your-machine>.<your-tailnet>.ts.net**
4. Login: tài khoản KOL Manager (email/password admin shop cấp)

## 🔧 Quản trị server (admin shop làm)

### Lệnh chính

```bash
cd "/Users/nhibopfam/Documents/quản lý kol koc booking/kol-manager"

# Start app (sau khi reboot máy)
docker compose --env-file .env.docker up -d

# Xem log app
docker compose logs -f app

# Stop app tạm thời (Tailscale serve vẫn còn → nhân sự sẽ thấy 502)
docker compose down

# Restart sau khi sửa code
docker compose --env-file .env.docker up -d --build app
```

### Tailscale serve

```bash
# Path CLI
alias ts='/Applications/Tailscale.app/Contents/MacOS/Tailscale'

# Xem proxy đang active
ts serve status

# Tắt proxy (nhân sự không vào được)
ts serve reset

# Bật lại proxy (nếu reboot máy bị mất)
ts serve --yes --bg --http=80 127.0.0.1:3000
```

### Auto-start sau reboot

Tailscale GUI tự start khi đăng nhập Mac. Nhưng `tailscale serve` config có thể bị mất. Nếu nhân sự báo không vào được sau khi bạn reboot máy:

```bash
# Chạy lại 1 lệnh:
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --yes --bg --http=80 127.0.0.1:3000

# Và check Docker đang chạy:
docker compose --env-file .env.docker up -d
```

## ⚠️ Quan trọng cần biết

1. **Máy host phải bật + Tailscale connected**: tắt máy hoặc tắt Tailscale → app down. Cân nhắc dùng máy bàn cũ luôn-bật làm server thay vì laptop.

2. **HTTP không HTTPS**: account Tailscale Free không cấp TLS cert. Traffic vẫn được mã hóa qua WireGuard (Tailscale tunnel), nhưng URL trên browser hiển thị `http://`. Để có HTTPS thật cần upgrade Tailscale Personal Pro ($5/tháng).

3. **Tài khoản KOL Manager khác Tailscale account**: 
   - Tailscale = để vào được URL `<your-machine>.<your-tailnet>.ts.net`
   - Email/password ở `/login` của app = tài khoản KOL Manager (admin shop cấp)

4. **App chỉ bind 127.0.0.1**: không lộ qua LAN/wifi nữa, chỉ qua Tailscale tunnel.

## 🐛 Khi nhân sự báo "không vào được"

Hỏi nhân sự thử lần lượt:

1. Tailscale app có hiện "Connected" không?
2. Trong list machines của Tailscale có thấy `kol-server` không?
3. Thử ping: mở Terminal/CMD gõ `ping kol-server` — phải resolve được IP `100.65.112.4`
4. Browser thử cả 2 URL:
   - `http://kol-server` (ngắn)
   - `http://<your-machine>.<your-tailnet>.ts.net` (full)
5. Nếu vẫn fail: flush DNS
   - Mac: `sudo dscacheutil -flushcache`
   - Win: `ipconfig /flushdns`

Admin shop check:
- https://login.tailscale.com/admin/machines → `kol-server` phải Online (xanh)
- Trên máy host: `ts serve status` phải có dòng proxy 127.0.0.1:3000
- `docker compose ps` → kol-manager-app phải Up
