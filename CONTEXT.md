# Video Demo Approval — Domain Context

> Tài liệu này tóm tắt domain + business rules cho feature "Video Demo Approval Flow".
> Đọc trước khi code mọi slice.

## Adapt sang codebase hiện tại (KHÁC plan gốc)

- **ORM**: Prisma (plan gốc giả định Drizzle — đã convert sang Prisma).
- **Role**: code dùng enum `Role { STAFF, MANAGER }`. Plan nói "Admin / Quản lý Shop" = **`MANAGER`**.
- **Video model**: 1 Video = 1 `CampaignKol` (link 1-1 qua `campaignKolId` unique). Không lưu `productId` ở Video — mặc định 1 KOL trong 1 campaign có 1 video demo.

## Domain Glossary

### Video lifecycle
- **Video**: bản demo của 1 KOL trong 1 campaign (link 1-1 với `CampaignKol`).
- **Demo**: bản preview KOL gửi TRƯỚC khi đăng TikTok, để công ty duyệt.
- **Submission**: 1 lần Booking Staff paste link Drive demo. 1 Video có nhiều Submissions (version 1, 2, 3...).
- **Revision loop**: chu kỳ "submit → review → revise → resubmit" cho đến khi MANAGER approve.
- **Demo status** (5 trạng thái):
  - `NOT_SUBMITTED`: chưa có demo
  - `DEMO_PENDING`: đã submit, chờ duyệt
  - `APPROVED`: manager đã duyệt
  - `NEEDS_REVISION`: manager yêu cầu sửa
  - `PUBLISHED`: video thật đã đăng TikTok
- **Pending queue**: videos có `demoStatus = DEMO_PENDING`, hiển thị cho MANAGER ở `/videos-pending`.
- **Current submission**: submission mới nhất của 1 video. Reference qua `videos.currentSubmissionId`.

### Actors
- **Booking Staff** (role=STAFF): trao đổi với KOL ngoài app (zalo). Submit link demo thay KOL.
- **Quản lý Shop / Manager** (role=MANAGER): duyệt video demo. DUY NHẤT có quyền approve / request revision.
- **KOL**: KHÔNG có account trong app.

## Key Business Rules

1. KOL không bao giờ động vào app — Booking Staff là người đại diện
2. 1 Video chỉ có 1 submission ở trạng thái `DEMO_PENDING` tại 1 thời điểm
3. Sau khi MANAGER REQUEST_REVISION, Booking Staff phải submit version mới (không edit version cũ)
4. Version cũ là read-only — không edit, không thêm comment mới
5. Comment thread thuộc về 1 submission cụ thể (Slice 2)
6. Chỉ user role `MANAGER` approve/request-revision được
7. Mọi staff đều xem được tất cả videos + comments (transparent)
8. Audit log lưu mọi action — không soft delete

## Conventions

- ID format: cuid cho mọi entity
- File naming: kebab-case
- Component naming: PascalCase
- Hooks: camelCase prefix `use`
- Time: UTC trong DB, display local
- Drive URL: validate phải match `drive.google.com` hoặc `docs.google.com`
- Submission version: bắt đầu từ 1, auto-increment per video
- Transaction: mọi mutation thay đổi >1 bảng PHẢI dùng `prisma.$transaction`
- Notification polling: 30s (Slice 4)

## Out of Scope (Phase 1)
- KOL có account
- Upload file (chỉ link Drive)
- Auto-pull thumbnail từ Drive
- Comment trên timestamp
- Email notification
- Auto-detect PUBLISHED
- Export report
- Multi-level approval
- Status REJECTED hẳn

## Slice plan
- **Slice 1**: Submit + Approve (current)
- **Slice 2**: Request Revision + Comment + Version 2
- **Slice 3**: Version History UI
- **Slice 4**: In-app Notification
- **Slice 5**: Filter + Audit Log
