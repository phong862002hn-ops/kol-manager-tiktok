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
  // Cascade: deleting CampaignKol removes Video + Submissions.
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
});
