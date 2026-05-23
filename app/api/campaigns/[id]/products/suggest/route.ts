import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helper";

// Trả về danh sách product unique từ file Excel (KOL trong campaign), loại trừ product đã có trong campaign
export async function GET(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const kols = await prisma.campaignKol.findMany({
      where: { campaignId: ctx.params.id },
      select: { username: true },
    });
    const usernames = kols.map((k) => k.username);
    if (usernames.length === 0) return NextResponse.json([]);

    const [orders, existing] = await Promise.all([
      prisma.tiktokOrder.findMany({
        where: { creatorUsername: { in: usernames, mode: "insensitive" } },
        select: { productId: true, productName: true, sku: true },
      }),
      prisma.product.findMany({
        where: { campaignId: ctx.params.id },
        select: { tiktokId: true },
      }),
    ]);
    const existingSet = new Set(existing.map((p) => p.tiktokId));

    const map = new Map<
      string,
      { tiktokId: string; name: string; sku: string | null; orderCount: number }
    >();
    for (const o of orders) {
      if (existingSet.has(o.productId)) continue;
      let v = map.get(o.productId);
      if (!v) {
        v = { tiktokId: o.productId, name: o.productName, sku: o.sku, orderCount: 0 };
        map.set(o.productId, v);
      }
      v.orderCount += 1;
    }

    return NextResponse.json(
      Array.from(map.values()).sort((a, b) => b.orderCount - a.orderCount)
    );
  } catch (err) {
    return handleApiError(err);
  }
}
