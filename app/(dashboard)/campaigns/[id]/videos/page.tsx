import { prisma } from "@/lib/prisma";
import { isCancelledOrder } from "@/lib/constants";
import { VideoListClient } from "./_components/VideoListClient";
import { DemoApprovalList, type DemoRow } from "./_components/DemoApprovalList";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  // Chỉ KOL đã chốt booking mới phải submit demo. Các trạng thái khác
  // (NEW_CONTACT/CONTACTING/NEGOTIATING/PAUSED) chưa đến giai đoạn này.
  const kols = await prisma.campaignKol.findMany({
    where: {
      campaignId: params.id,
      deletedAt: null,
      status: "BOOKED",
    },
    select: {
      id: true,
      username: true,
      video: {
        select: {
          id: true,
          demoStatus: true,
          currentSubmission: {
            select: { id: true, version: true, driveUrl: true, submittedAt: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const usernames = kols.map((k) => k.username);

  const demoRows: DemoRow[] = kols.map((k) => ({
    campaignKolId: k.id,
    username: k.username,
    demoStatus: k.video?.demoStatus ?? "NOT_SUBMITTED",
    videoId: k.video?.id ?? null,
    currentSubmission: k.video?.currentSubmission
      ? {
          id: k.video.currentSubmission.id,
          version: k.video.currentSubmission.version,
          driveUrl: k.video.currentSubmission.driveUrl,
          submittedAt: k.video.currentSubmission.submittedAt.toISOString(),
        }
      : null,
  }));

  if (usernames.length === 0) {
    return (
      <div className="p-8 space-y-8">
        <DemoSection rows={demoRows} />
        <VideoListClient rows={[]} kpi={{ count: 0, gmv: 0, avgGmv: 0 }} />
      </div>
    );
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

  return (
    <div className="p-8 space-y-8">
      <DemoSection rows={demoRows} />
      <VideoListClient rows={rows} kpi={kpi} embedded />
    </div>
  );
}

function DemoSection({ rows }: { rows: DemoRow[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-3">
        Demo cần duyệt
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Booking Staff submit link Drive demo của KOL trước khi đăng TikTok. Quản
        lý Shop sẽ duyệt ở tab &quot;Video cần duyệt&quot;.
      </p>
      <DemoApprovalList rows={rows} />
    </section>
  );
}
