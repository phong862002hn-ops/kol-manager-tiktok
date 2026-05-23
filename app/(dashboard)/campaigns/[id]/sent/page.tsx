import { prisma } from "@/lib/prisma";
import { SentOrderListClient } from "./_components/SentOrderListClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const [sentOrders, kols, products, users] = await Promise.all([
    prisma.sentOrder.findMany({
      where: { campaignId: params.id, deletedAt: null },
      orderBy: { sentDate: "desc" },
    }),
    prisma.campaignKol.findMany({
      where: { campaignId: params.id, deletedAt: null },
      select: { id: true, username: true },
      orderBy: { username: "asc" },
    }),
    prisma.product.findMany({
      where: { campaignId: params.id, deletedAt: null },
      select: { id: true, tiktokId: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return (
    <SentOrderListClient
      campaignId={params.id}
      kols={kols}
      products={products}
      users={users}
      orders={sentOrders.map((o) => ({
        id: o.id,
        sentDate: o.sentDate.toISOString(),
        kolUsername: o.kolUsername,
        channel: o.channel,
        sampleType: o.sampleType,
        tiktokOrderId: o.tiktokOrderId,
        products: o.products as Array<{ productId: string; productName: string; quantity: number }>,
        staffId: o.staffId,
        staffName: o.staffId ? userMap.get(o.staffId) ?? null : null,
        status: o.status,
        trackingCode: o.trackingCode,
        note: o.note,
      }))}
    />
  );
}
