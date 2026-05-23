import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { normalizeUsername } from "@/lib/format";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET ?campaignKolId=xxx | ?kolUsername=xxx — list comments theo scope
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const campaignKolId = req.nextUrl.searchParams.get("campaignKolId");
    const kolUsername = req.nextUrl.searchParams.get("kolUsername");

    if (!campaignKolId && !kolUsername) {
      return apiError("Thiếu campaignKolId hoặc kolUsername");
    }

    const comments = await prisma.kolComment.findMany({
      where: {
        deletedAt: null,
        ...(campaignKolId ? { campaignKolId } : {}),
        ...(kolUsername ? { kolUsername: normalizeUsername(kolUsername) } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(comments);
  } catch (err) {
    return handleApiError(err);
  }
}

// POST: tạo comment. Phải có 1 trong 2 scope
const createSchema = z
  .object({
    campaignKolId: z.string().optional(),
    kolUsername: z.string().optional(),
    content: z.string().min(1).max(2000),
  })
  .refine((d) => !!d.campaignKolId !== !!d.kolUsername, {
    message: "Phải có CHÍNH XÁC 1 trong campaignKolId hoặc kolUsername",
  });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const data = createSchema.parse(await req.json());
    const created = await prisma.kolComment.create({
      data: {
        userId: session.user.id,
        content: data.content.trim(),
        campaignKolId: data.campaignKolId ?? null,
        kolUsername: data.kolUsername
          ? normalizeUsername(data.kolUsername)
          : null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Notify staff phụ trách / hoặc tất cả staff của các campaignKol theo username
    const recipientIds = new Set<string>();
    if (data.campaignKolId) {
      const ck = await prisma.campaignKol.findUnique({
        where: { id: data.campaignKolId },
        select: { staffId: true, username: true, campaignId: true },
      });
      if (ck?.staffId && ck.staffId !== session.user.id) {
        recipientIds.add(ck.staffId);
      }
      if (ck) {
        await notify(
          Array.from(recipientIds).map((rid) => ({
            recipientId: rid,
            type: "COMMENT_NEW" as const,
            title: `${session.user.name} bình luận về @${ck.username}`,
            body:
              created.content.length > 100
                ? created.content.slice(0, 100) + "..."
                : created.content,
            link: `/campaigns/${ck.campaignId}/kols`,
          }))
        );
      }
    } else if (data.kolUsername) {
      // Cross-campaign: notify staff đang phụ trách KOL này ở mọi campaign
      const cks = await prisma.campaignKol.findMany({
        where: {
          username: normalizeUsername(data.kolUsername),
          deletedAt: null,
          staffId: { not: null },
        },
        select: { staffId: true },
      });
      for (const ck of cks) {
        if (ck.staffId && ck.staffId !== session.user.id) {
          recipientIds.add(ck.staffId);
        }
      }
      await notify(
        Array.from(recipientIds).map((rid) => ({
          recipientId: rid,
          type: "COMMENT_NEW" as const,
          title: `${session.user.name} bình luận về @${data.kolUsername}`,
          body:
            created.content.length > 100
              ? created.content.slice(0, 100) + "..."
              : created.content,
          link: `/kols`,
        }))
      );
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
