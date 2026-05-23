import { prisma } from "@/lib/prisma";
import { isCancelledOrder } from "@/lib/constants";
import { ProductListClient } from "./_components/ProductListClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const [products, kols] = await Promise.all([
    prisma.product.findMany({
      where: { campaignId: params.id, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.campaignKol.findMany({
      where: { campaignId: params.id, deletedAt: null },
      select: { username: true },
    }),
  ]);

  const usernames = kols.map((k) => k.username);
  // Stats per product (KOL bán, đơn, doanh thu) — chỉ từ KOL trong campaign
  let orders: { productId: string; creatorUsername: string; commissionBase: number | null; orderStatus: string }[] = [];
  if (usernames.length > 0) {
    orders = await prisma.tiktokOrder.findMany({
      where: {
        creatorUsername: { in: usernames, mode: "insensitive" },
        import: { deletedAt: null },
      },
      select: {
        productId: true,
        creatorUsername: true,
        commissionBase: true,
        orderStatus: true,
      },
    });
  }

  const stats = new Map<
    string,
    { kols: Set<string>; orders: number; revenue: number }
  >();
  for (const o of orders) {
    if (isCancelledOrder(o.orderStatus)) continue;
    let v = stats.get(o.productId);
    if (!v) {
      v = { kols: new Set(), orders: 0, revenue: 0 };
      stats.set(o.productId, v);
    }
    v.kols.add(o.creatorUsername.toLowerCase());
    v.orders += 1;
    v.revenue += o.commissionBase ?? 0;
  }

  const rows = products.map((p) => {
    const s = stats.get(p.tiktokId);
    return {
      id: p.id,
      tiktokId: p.tiktokId,
      name: p.name,
      sku: p.sku,
      note: p.note,
      kolCount: s?.kols.size ?? 0,
      orders: s?.orders ?? 0,
      revenue: s?.revenue ?? 0,
    };
  });

  return <ProductListClient campaignId={params.id} rows={rows} />;
}
