import { prisma } from "@/lib/prisma";
import { isCancelledOrder } from "@/lib/constants";
import { VideoListClient } from "./_components/VideoListClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const kols = await prisma.campaignKol.findMany({
    where: { campaignId: params.id, deletedAt: null },
    select: { username: true },
  });
  const usernames = kols.map((k) => k.username);

  if (usernames.length === 0) {
    return <VideoListClient rows={[]} kpi={{ count: 0, gmv: 0, avgGmv: 0 }} />;
  }

  const orders = await prisma.tiktokOrder.findMany({
    where: {
      creatorUsername: { in: usernames, mode: "insensitive" },
      contentId: { not: null },
      import: { deletedAt: null },
    },
    select: {
      contentId: true,
      creatorUsername: true,
      contentType: true,
      commissionBase: true,
      commissionPayment: true,
      orderStatus: true,
    },
  });

  // group theo contentId
  const map = new Map<
    string,
    {
      contentId: string;
      username: string;
      contentType: string | null;
      totalOrders: number;
      validOrders: number;
      gmv: number;
      commission: number;
    }
  >();
  for (const o of orders) {
    const cid = o.contentId!;
    let v = map.get(cid);
    if (!v) {
      v = {
        contentId: cid,
        username: o.creatorUsername,
        contentType: o.contentType,
        totalOrders: 0,
        validOrders: 0,
        gmv: 0,
        commission: 0,
      };
      map.set(cid, v);
    }
    v.totalOrders += 1;
    if (!isCancelledOrder(o.orderStatus)) {
      v.validOrders += 1;
      v.gmv += o.commissionBase ?? 0;
      v.commission += o.commissionPayment ?? 0;
    }
  }

  const contentIds = Array.from(map.keys());
  const links = await prisma.videoLink.findMany({
    where: { contentId: { in: contentIds } },
  });
  const linkMap = new Map(links.map((l) => [l.contentId, l]));

  const rows = Array.from(map.values())
    .map((v) => ({
      ...v,
      url: linkMap.get(v.contentId)?.url ?? null,
      note: linkMap.get(v.contentId)?.note ?? null,
    }))
    .sort((a, b) => b.gmv - a.gmv);

  const totalGmv = rows.reduce((s, r) => s + r.gmv, 0);
  const kpi = {
    count: rows.length,
    gmv: totalGmv,
    avgGmv: rows.length > 0 ? Math.round(totalGmv / rows.length) : 0,
  };

  return <VideoListClient rows={rows} kpi={kpi} />;
}
