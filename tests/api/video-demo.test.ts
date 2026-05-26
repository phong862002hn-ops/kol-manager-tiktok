/**
 * Integration tests cho Video Demo Approval (Slice 1).
 *
 * Chạy trực tiếp các route handler với NextRequest đã build sẵn.
 * Sử dụng dev DB hiện tại — mỗi test tự tạo seed riêng (User, Campaign,
 * CampaignKol) và clean up sau khi xong. Mock getServerSession để giả định
 * user đang đăng nhập.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST as submitPOST } from "@/app/api/campaign-kols/[id]/submissions/route";
import { POST as reviewPOST } from "@/app/api/videos/[id]/review/route";
import {
  POST as commentPOST,
  GET as commentGET,
} from "@/app/api/submissions/[id]/comments/route";
import { GET as historyGET } from "@/app/api/videos/[id]/submissions/route";

type Seed = {
  staffId: string;
  managerId: string;
  campaignId: string;
  campaignKolId: string;
};

const VALID_DRIVE_URL = "https://drive.google.com/file/d/abc123/view";

async function makeSeed(): Promise<Seed> {
  const suffix = randomUUID().slice(0, 8);
  const staff = await prisma.user.create({
    data: {
      email: `staff-${suffix}@test.local`,
      password: "x",
      name: `Staff ${suffix}`,
      role: "STAFF",
    },
  });
  const manager = await prisma.user.create({
    data: {
      email: `mgr-${suffix}@test.local`,
      password: "x",
      name: `Manager ${suffix}`,
      role: "MANAGER",
    },
  });
  const campaign = await prisma.campaign.create({
    data: {
      name: `Test Campaign ${suffix}`,
      createdById: staff.id,
    },
  });
  const ck = await prisma.campaignKol.create({
    data: {
      campaignId: campaign.id,
      username: `kol-${suffix}`,
      createdById: staff.id,
      status: "BOOKED",
    },
  });
  return {
    staffId: staff.id,
    managerId: manager.id,
    campaignId: campaign.id,
    campaignKolId: ck.id,
  };
}

async function cleanupSeed(s: Seed) {
  // Cascade: deleting CampaignKol removes Video → Submissions → Comments.
  // Notifications + audit logs reference users, dọn riêng.
  await prisma.notification.deleteMany({
    where: { recipientId: { in: [s.staffId, s.managerId] } },
  });
  await prisma.video.deleteMany({ where: { campaignKolId: s.campaignKolId } });
  await prisma.campaignKol.delete({ where: { id: s.campaignKolId } }).catch(() => {});
  await prisma.campaign.delete({ where: { id: s.campaignId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: [s.staffId, s.managerId] } } });
}

function sessionFor(userId: string, role: "STAFF" | "MANAGER", name = "T", email = "t@t") {
  return {
    user: { id: userId, role, name, email },
    expires: "2099-01-01",
  };
}

function jsonReq(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Video Demo Approval — Slice 1", () => {
  let seed: Seed;

  beforeEach(async () => {
    seed = await makeSeed();
    vi.mocked(getServerSession).mockReset();
  });

  afterEach(async () => {
    await cleanupSeed(seed);
  });

  it("staff submits demo → manager approves → DB updated", async () => {
    // 1. Staff submit
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const submitRes = await submitPOST(
      jsonReq("http://t/api/campaign-kols/x/submissions", { driveUrl: VALID_DRIVE_URL }),
      { params: { id: seed.campaignKolId } }
    );
    expect(submitRes.status).toBe(201);
    const submitBody = await submitRes.json();
    const videoId = submitBody.video.id;

    let video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    expect(video.demoStatus).toBe("DEMO_PENDING");
    expect(video.currentSubmissionId).toBe(submitBody.submission.id);

    // 2. Manager approve
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.managerId, "MANAGER") as never);
    const reviewRes = await reviewPOST(
      jsonReq("http://t/api/videos/x/review", { action: "APPROVE" }),
      { params: { id: videoId } }
    );
    expect(reviewRes.status).toBe(200);

    video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    expect(video.demoStatus).toBe("APPROVED");
    const sub = await prisma.videoSubmission.findUniqueOrThrow({
      where: { id: submitBody.submission.id },
    });
    expect(sub.status).toBe("APPROVED");
    expect(sub.reviewedById).toBe(seed.managerId);
    expect(sub.reviewedAt).not.toBeNull();
  });

  it("staff cannot approve (403)", async () => {
    // First create a pending video
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const submitRes = await submitPOST(
      jsonReq("http://t/api/campaign-kols/x/submissions", { driveUrl: VALID_DRIVE_URL }),
      { params: { id: seed.campaignKolId } }
    );
    const videoId = (await submitRes.json()).video.id;

    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const res = await reviewPOST(
      jsonReq("http://t/api/videos/x/review", { action: "APPROVE" }),
      { params: { id: videoId } }
    );
    expect(res.status).toBe(403);
  });

  it("submit while previous pending → 409", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const first = await submitPOST(
      jsonReq("http://t/api/campaign-kols/x/submissions", { driveUrl: VALID_DRIVE_URL }),
      { params: { id: seed.campaignKolId } }
    );
    expect(first.status).toBe(201);

    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const second = await submitPOST(
      jsonReq("http://t/api/campaign-kols/x/submissions", { driveUrl: VALID_DRIVE_URL }),
      { params: { id: seed.campaignKolId } }
    );
    expect(second.status).toBe(409);
  });

  it("rejects submit when KOL status != BOOKED (400)", async () => {
    await prisma.campaignKol.update({
      where: { id: seed.campaignKolId },
      data: { status: "NEGOTIATING" },
    });
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const res = await submitPOST(
      jsonReq("http://t/api/campaign-kols/x/submissions", { driveUrl: VALID_DRIVE_URL }),
      { params: { id: seed.campaignKolId } }
    );
    expect(res.status).toBe(400);
  });

  it("rejects non-Drive URL (400)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const res = await submitPOST(
      jsonReq("http://t/api/campaign-kols/x/submissions", {
        driveUrl: "https://example.com/video.mp4",
      }),
      { params: { id: seed.campaignKolId } }
    );
    expect(res.status).toBe(400);
  });

  // ─── Slice 2: REQUEST_REVISION + comments ────────────────────────────

  it("REQUEST_REVISION sets status NEEDS_REVISION + saves comment", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const submitRes = await submitPOST(
      jsonReq("http://t", { driveUrl: VALID_DRIVE_URL }),
      { params: { id: seed.campaignKolId } }
    );
    const videoId = (await submitRes.json()).video.id;

    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.managerId, "MANAGER") as never);
    const res = await reviewPOST(
      jsonReq("http://t", {
        action: "REQUEST_REVISION",
        comment: "Ánh sáng yếu, quay lại",
      }),
      { params: { id: videoId } }
    );
    expect(res.status).toBe(200);

    const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    expect(video.demoStatus).toBe("NEEDS_REVISION");

    const sub = await prisma.videoSubmission.findUniqueOrThrow({
      where: { id: video.currentSubmissionId! },
      include: { comments: true },
    });
    expect(sub.status).toBe("NEEDS_REVISION");
    expect(sub.comments).toHaveLength(1);
    expect(sub.comments[0].body).toBe("Ánh sáng yếu, quay lại");
    expect(sub.comments[0].authorId).toBe(seed.managerId);
  });

  it("After NEEDS_REVISION, staff submits v2 → version=2 + new currentSubmission", async () => {
    // v1 + reject
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const r1 = await submitPOST(jsonReq("http://t", { driveUrl: VALID_DRIVE_URL }), {
      params: { id: seed.campaignKolId },
    });
    const videoId = (await r1.json()).video.id;

    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.managerId, "MANAGER") as never);
    await reviewPOST(jsonReq("http://t", { action: "REQUEST_REVISION" }), {
      params: { id: videoId },
    });

    // v2
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const r2 = await submitPOST(
      jsonReq("http://t", { driveUrl: "https://drive.google.com/file/d/xyz/view" }),
      { params: { id: seed.campaignKolId } }
    );
    expect(r2.status).toBe(201);
    const body2 = await r2.json();
    expect(body2.submission.version).toBe(2);

    const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    expect(video.demoStatus).toBe("DEMO_PENDING");
    expect(video.currentSubmissionId).toBe(body2.submission.id);
  });

  it("Comment on CURRENT submission OK, on OLD submission rejected (400)", async () => {
    // v1
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const r1 = await submitPOST(jsonReq("http://t", { driveUrl: VALID_DRIVE_URL }), {
      params: { id: seed.campaignKolId },
    });
    const r1Body = await r1.json();
    const v1SubmissionId = r1Body.submission.id;
    const videoId = r1Body.video.id;

    // Comment trên v1 (current) → OK
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const c1 = await commentPOST(jsonReq("http://t", { body: "Đã gửi xong" }), {
      params: { id: v1SubmissionId },
    });
    expect(c1.status).toBe(201);

    // Manager request revision → v1 không còn là current
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.managerId, "MANAGER") as never);
    await reviewPOST(jsonReq("http://t", { action: "REQUEST_REVISION" }), {
      params: { id: videoId },
    });

    // Staff submit v2 → v1 trở thành old (currentOf bị move sang v2)
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    await submitPOST(
      jsonReq("http://t", { driveUrl: "https://drive.google.com/file/d/v2/view" }),
      { params: { id: seed.campaignKolId } }
    );

    // Comment trên v1 (giờ là old) → 400
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const cOld = await commentPOST(jsonReq("http://t", { body: "comment trên old" }), {
      params: { id: v1SubmissionId },
    });
    expect(cOld.status).toBe(400);

    // GET comments của v1 (old) vẫn xem được
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const list = await commentGET(jsonReq("http://t", {}), { params: { id: v1SubmissionId } });
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody).toHaveLength(1); // chỉ có comment "Đã gửi xong" lúc đầu
  });

  // ─── Slice 3: history endpoint ───────────────────────────────────────

  it("GET /api/videos/[id]/submissions returns all versions desc", async () => {
    // v1
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const r1 = await submitPOST(jsonReq("http://t", { driveUrl: VALID_DRIVE_URL }), {
      params: { id: seed.campaignKolId },
    });
    const videoId = (await r1.json()).video.id;

    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.managerId, "MANAGER") as never);
    await reviewPOST(jsonReq("http://t", { action: "REQUEST_REVISION" }), {
      params: { id: videoId },
    });

    // v2
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    await submitPOST(
      jsonReq("http://t", { driveUrl: "https://drive.google.com/file/d/v2/view" }),
      { params: { id: seed.campaignKolId } }
    );

    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const res = await historyGET(jsonReq("http://t", {}), { params: { id: videoId } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submissions).toHaveLength(2);
    expect(body.submissions[0].version).toBe(2); // newest first
    expect(body.submissions[1].version).toBe(1);
  });

  // ─── Slice 4: notification side-effect ───────────────────────────────

  it("submit creates VIDEO_DEMO_PENDING notification for managers", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    await submitPOST(jsonReq("http://t", { driveUrl: VALID_DRIVE_URL }), {
      params: { id: seed.campaignKolId },
    });

    const noti = await prisma.notification.findFirst({
      where: { recipientId: seed.managerId, type: "VIDEO_DEMO_PENDING" },
    });
    expect(noti).not.toBeNull();
    expect(noti!.link).toBe("/videos-pending");
  });

  it("approve creates VIDEO_DEMO_APPROVED notification for submitter", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.staffId, "STAFF") as never);
    const r = await submitPOST(jsonReq("http://t", { driveUrl: VALID_DRIVE_URL }), {
      params: { id: seed.campaignKolId },
    });
    const videoId = (await r.json()).video.id;

    vi.mocked(getServerSession).mockResolvedValueOnce(sessionFor(seed.managerId, "MANAGER") as never);
    await reviewPOST(jsonReq("http://t", { action: "APPROVE" }), {
      params: { id: videoId },
    });

    const noti = await prisma.notification.findFirst({
      where: { recipientId: seed.staffId, type: "VIDEO_DEMO_APPROVED" },
    });
    expect(noti).not.toBeNull();
  });
});
