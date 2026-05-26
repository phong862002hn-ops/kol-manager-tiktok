import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

// GET ?limit=50&offset=0 — list video đang chờ duyệt cho admin queue.
// Eager load campaignKol (campaign) + currentSubmission (+ submittedBy) để tránh N+1.
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const url = req.nextUrl;
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { demoStatus: "DEMO_PENDING" },
        include: {
          campaignKol: {
            select: {
              id: true,
              username: true,
              campaign: { select: { id: true, name: true } },
            },
          },
          currentSubmission: {
            include: {
              submittedBy: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { updatedAt: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.video.count({ where: { demoStatus: "DEMO_PENDING" } }),
    ]);

    return NextResponse.json({ videos, total });
  } catch (err) {
    return handleApiError(err);
  }
}
