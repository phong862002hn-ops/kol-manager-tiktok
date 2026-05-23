import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";
import { normalizeUsername } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET ?campaignKolIds=a,b,c → { a: 3, b: 0, c: 1 } (count per campaign KOL)
//     ?usernames=a,b      → { a: 5, b: 2 } (count cross-campaign per username)
export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const ckIds = req.nextUrl.searchParams.get("campaignKolIds");
    const usernames = req.nextUrl.searchParams.get("usernames");

    if (ckIds) {
      const ids = ckIds.split(",").filter(Boolean);
      if (ids.length === 0) return NextResponse.json({});
      const groups = await prisma.kolComment.groupBy({
        by: ["campaignKolId"],
        where: { campaignKolId: { in: ids }, deletedAt: null },
        _count: { _all: true },
      });
      const result: Record<string, number> = {};
      for (const id of ids) result[id] = 0;
      for (const g of groups) {
        if (g.campaignKolId) result[g.campaignKolId] = g._count._all;
      }
      return NextResponse.json(result);
    }

    if (usernames) {
      const list = usernames
        .split(",")
        .map((u) => normalizeUsername(u))
        .filter(Boolean);
      if (list.length === 0) return NextResponse.json({});
      const groups = await prisma.kolComment.groupBy({
        by: ["kolUsername"],
        where: { kolUsername: { in: list }, deletedAt: null },
        _count: { _all: true },
      });
      const result: Record<string, number> = {};
      for (const u of list) result[u] = 0;
      for (const g of groups) {
        if (g.kolUsername) result[g.kolUsername] = g._count._all;
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({});
  } catch (err) {
    return handleApiError(err);
  }
}
