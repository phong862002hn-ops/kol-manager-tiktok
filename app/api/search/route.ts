import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length === 0) {
      return NextResponse.json({ campaigns: [], kols: [] });
    }
    const [campaigns, kols] = await Promise.all([
      prisma.campaign.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, status: true },
        take: 5,
      }),
      prisma.campaignKol.findMany({
        where: { username: { contains: q.toLowerCase(), mode: "insensitive" } },
        include: { campaign: { select: { id: true, name: true } } },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      campaigns,
      kols: kols.map((k) => ({
        id: k.id,
        username: k.username,
        campaignId: k.campaign.id,
        campaignName: k.campaign.name,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
