import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { normalizeUsername } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, ctx: { params: { username: string } }) {
  try {
    await requireSession();
    const username = normalizeUsername(decodeURIComponent(ctx.params.username));
    const profile = await prisma.kolProfile.findUnique({ where: { username } });
    // Trả empty profile nếu chưa có — FE dễ xử lý
    return NextResponse.json(
      profile ?? {
        username,
        followerCount: null,
        malePercent: null,
        note: null,
        updatedAt: null,
        updatedBy: null,
      }
    );
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  followerCount: z.number().int().nonnegative().nullable().optional(),
  malePercent: z.number().min(0).max(100).nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: { username: string } }
) {
  try {
    const session = await requireSession();
    const username = normalizeUsername(decodeURIComponent(ctx.params.username));
    const data = patchSchema.parse(await req.json());
    const profile = await prisma.kolProfile.upsert({
      where: { username },
      update: {
        ...(data.followerCount !== undefined && { followerCount: data.followerCount }),
        ...(data.malePercent !== undefined && { malePercent: data.malePercent }),
        ...(data.note !== undefined && { note: data.note }),
        updatedBy: session.user.name ?? session.user.email ?? null,
      },
      create: {
        username,
        followerCount: data.followerCount ?? null,
        malePercent: data.malePercent ?? null,
        note: data.note ?? null,
        updatedBy: session.user.name ?? session.user.email ?? null,
      },
    });
    return NextResponse.json(profile);
  } catch (err) {
    return handleApiError(err);
  }
}
