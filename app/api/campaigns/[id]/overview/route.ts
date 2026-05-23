import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { isCancelledOrder } from "@/lib/constants";

export const dynamic = "force-dynamic";

function parseDateParam(s: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"));
    const toEnd = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;
    const staffFilter = searchParams.get("staffId") || null;

    const campaign = await prisma.campaign.findFirst({
      where: { id: ctx.params.id, deletedAt: null },
      select: { id: true, targetKoc: true, targetVideos: true },
    });
    if (!campaign) return apiError("Không tìm thấy", 404);

    const allKols = await prisma.campaignKol.findMany({
      where: { campaignId: ctx.params.id, deletedAt: null },
      include: {
        castCost: true,
        staff: { select: { id: true, name: true } },
      },
    });

    // Apply staff filter on KOL list
    const kols = staffFilter
      ? allKols.filter((k) => k.staffId === staffFilter)
      : allKols;
    const usernames = kols.map((k) => k.username);

    // ── Orders trong date range ──
    const dateFilter =
      from || toEnd
        ? {
            createdTime: {
              ...(from ? { gte: from } : {}),
              ...(toEnd ? { lte: toEnd } : {}),
            },
          }
        : {};
    const orders =
      usernames.length === 0
        ? []
        : await prisma.tiktokOrder.findMany({
            where: {
              creatorUsername: { in: usernames, mode: "insensitive" },
              import: { deletedAt: null },
              ...dateFilter,
            },
            select: {
              creatorUsername: true,
              productId: true,
              productName: true,
              commissionBase: true,
              paymentMethod: true,
              orderStatus: true,
              contentId: true,
              createdTime: true,
            },
          });

    // Sent orders (sample) for campaign
    const sentOrders = await prisma.sentOrder.findMany({
      where: { campaignId: ctx.params.id, deletedAt: null },
      select: { kolUsername: true, status: true },
    });

    // Products in campaign
    const products = await prisma.product.findMany({
      where: { campaignId: ctx.params.id, deletedAt: null },
      select: { id: true, tiktokId: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.tiktokId, p.name]));

    // CastCost - to get sample/cast cost stats
    const castCosts = kols.map((k) => k.castCost).filter((c): c is NonNullable<typeof c> => !!c);

    // ── Helpers ──
    const validOrders = orders.filter((o) => !isCancelledOrder(o.orderStatus));

    // KOL → list valid orders
    const ordersByKol = new Map<string, typeof validOrders>();
    for (const o of validOrders) {
      const u = o.creatorUsername.toLowerCase();
      if (!ordersByKol.has(u)) ordersByKol.set(u, []);
      ordersByKol.get(u)!.push(o);
    }

    // ===== NHÓM 1 =====
    const bookedCount = kols.filter((k) => k.status === "BOOKED").length;
    const videoSet = new Set<string>();
    for (const o of validOrders) if (o.contentId) videoSet.add(o.contentId);
    const totalCod = validOrders
      .filter((o) => (o.paymentMethod ?? "").toUpperCase().includes("COD"))
      .reduce((s, o) => s + (o.commissionBase ?? 0), 0);
    const videoRevenue = validOrders
      .filter((o) => o.contentId)
      .reduce((s, o) => s + (o.commissionBase ?? 0), 0);

    // ===== NHÓM 2 =====
    // per product (booked = số đơn hợp lệ tham gia? plan nói "đã booking 234/500" — đếm KOL bán SP này)
    type ProductAgg = { productId: string; name: string; soldKols: Set<string>; orderCount: number };
    const productMap2 = new Map<string, ProductAgg>();
    for (const o of validOrders) {
      let v = productMap2.get(o.productId);
      if (!v) {
        v = {
          productId: o.productId,
          name: productMap.get(o.productId) ?? o.productName,
          soldKols: new Set(),
          orderCount: 0,
        };
        productMap2.set(o.productId, v);
      }
      v.soldKols.add(o.creatorUsername.toLowerCase());
      v.orderCount += 1;
    }
    const productProgress = Array.from(productMap2.values())
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        booked: p.soldKols.size,
        target: 0, // không có target per product riêng — UI hiển thị số tuyệt đối
        orderCount: p.orderCount,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    // per staff (KOC count + Video count)
    const staffNameMap = new Map<string, string>();
    for (const k of allKols) {
      if (k.staff) staffNameMap.set(k.staff.id, k.staff.name);
    }
    type StaffAgg = { staffId: string; name: string; kocCount: number; videoSet: Set<string> };
    const staffMap = new Map<string, StaffAgg>();
    for (const k of kols) {
      const sid = k.staffId ?? "__unassigned";
      const sname = k.staffId ? staffNameMap.get(k.staffId) ?? "Không tên" : "Chưa gán";
      let v = staffMap.get(sid);
      if (!v) {
        v = { staffId: sid, name: sname, kocCount: 0, videoSet: new Set() };
        staffMap.set(sid, v);
      }
      v.kocCount += 1;
      const kolOrders = ordersByKol.get(k.username.toLowerCase()) ?? [];
      for (const o of kolOrders) if (o.contentId) v.videoSet.add(o.contentId);
    }
    const staffProgress = Array.from(staffMap.values())
      .map((s) => ({
        staffId: s.staffId,
        name: s.name,
        kocCount: s.kocCount,
        videoCount: s.videoSet.size,
      }))
      .sort((a, b) => b.kocCount - a.kocCount);

    // per tag
    type TagAgg = { tag: string; count: number };
    const tagMap = new Map<string, TagAgg>();
    for (const k of kols) {
      const t = k.tag?.trim() || "(không tag)";
      let v = tagMap.get(t);
      if (!v) {
        v = { tag: t, count: 0 };
        tagMap.set(t, v);
      }
      v.count += 1;
    }
    const tagProgress = Array.from(tagMap.values()).sort((a, b) => b.count - a.count);

    // ===== NHÓM 3 =====
    const contactStatus: Record<string, number> = {
      PAUSED: 0,
      NEW_CONTACT: 0,
      CONTACTING: 0,
      NEGOTIATING: 0,
      BOOKED: 0,
    };
    for (const k of kols) contactStatus[k.status] = (contactStatus[k.status] ?? 0) + 1;

    // Sent: số gửi & hoàn thành
    const kolUsernameSet = new Set(usernames.map((u) => u.toLowerCase()));
    const filteredSent = sentOrders.filter((s) =>
      kolUsernameSet.has(s.kolUsername.toLowerCase())
    );
    const sampleSent = filteredSent.length;
    const sampleCompleted = filteredSent.filter((s) => s.status === "DELIVERED").length;

    // staffPerformance: số "done" (KOL có ít nhất 1 video) trên tổng KOL gán
    const staffPerformance = Array.from(staffMap.values()).map((s) => {
      // total = kocCount, done = số KOL của staff đó có >= 1 video
      const done = kols
        .filter((k) => (k.staffId ?? "__unassigned") === s.staffId)
        .filter((k) => {
          const kolOrders = ordersByKol.get(k.username.toLowerCase()) ?? [];
          return kolOrders.some((o) => o.contentId);
        }).length;
      return {
        staffId: s.staffId,
        name: s.name,
        done,
        total: s.kocCount,
        percent: s.kocCount > 0 ? Math.round((done / s.kocCount) * 100) : 0,
      };
    });

    // ===== NHÓM 4 =====
    const totalCastCost = castCosts.reduce((s, c) => s + c.amount, 0);
    const paidCast = castCosts.reduce((s, c) => s + c.paidAmount, 0);

    const revenueGroup = <T extends string>(
      keyOf: (o: (typeof validOrders)[number]) => T | null,
      nameOf: (k: T) => string
    ) => {
      const m = new Map<T, number>();
      for (const o of validOrders) {
        const k = keyOf(o);
        if (k == null) continue;
        m.set(k, (m.get(k) ?? 0) + (o.commissionBase ?? 0));
      }
      const total = Array.from(m.values()).reduce((s, v) => s + v, 0);
      return Array.from(m.entries())
        .map(([k, v]) => ({
          key: k,
          name: nameOf(k),
          revenue: v,
          percent: total > 0 ? Math.round((v / total) * 100) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);
    };

    const tagOfKol = new Map(kols.map((k) => [k.username.toLowerCase(), k.tag?.trim() || "(không tag)"]));
    const revenueByTag = revenueGroup<string>(
      (o) => tagOfKol.get(o.creatorUsername.toLowerCase()) ?? null,
      (k) => k
    );
    const revenueByProduct = revenueGroup<string>(
      (o) => o.productId,
      (k) => productMap.get(k) ?? k
    );
    const staffOfKol = new Map(
      kols.map((k) => [
        k.username.toLowerCase(),
        k.staffId ?? "__unassigned",
      ])
    );
    const revenueByStaff = revenueGroup<string>(
      (o) => staffOfKol.get(o.creatorUsername.toLowerCase()) ?? null,
      (k) => (k === "__unassigned" ? "Chưa gán" : staffNameMap.get(k) ?? "Không tên")
    );

    // ===== NHÓM 5C =====
    type VideoStat = { staffId: string; name: string; count: number; revenue: number };
    const videoStaff = new Map<string, VideoStat>();
    for (const o of validOrders) {
      if (!o.contentId) continue;
      const sid = staffOfKol.get(o.creatorUsername.toLowerCase()) ?? "__unassigned";
      const sname = sid === "__unassigned" ? "Chưa gán" : staffNameMap.get(sid) ?? "Không tên";
      let v = videoStaff.get(sid);
      if (!v) {
        v = { staffId: sid, name: sname, count: 0, revenue: 0 };
        videoStaff.set(sid, v);
      }
      v.revenue += o.commissionBase ?? 0;
    }
    // count: unique contentId per staff
    const videoStaffCounts = new Map<string, Set<string>>();
    for (const o of validOrders) {
      if (!o.contentId) continue;
      const sid = staffOfKol.get(o.creatorUsername.toLowerCase()) ?? "__unassigned";
      if (!videoStaffCounts.has(sid)) videoStaffCounts.set(sid, new Set());
      videoStaffCounts.get(sid)!.add(o.contentId);
    }
    videoStaffCounts.forEach((set, sid) => {
      const v = videoStaff.get(sid);
      if (v) v.count = set.size;
    });
    const videoRatioByStaff = Array.from(videoStaff.values())
      .map(({ staffId, name, count }) => ({ staffId, name, count }))
      .sort((a, b) => b.count - a.count);
    const totalVideoCount = videoRatioByStaff.reduce((s, v) => s + v.count, 0);
    const videoRatioByStaffWithPct = videoRatioByStaff.map((v) => ({
      ...v,
      percent: totalVideoCount > 0 ? Math.round((v.count / totalVideoCount) * 100) : 0,
    }));

    const videoRevenueByStaff = Array.from(videoStaff.values())
      .map(({ staffId, name, revenue }) => ({ staffId, name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
    const totalVideoRevenue = videoRevenueByStaff.reduce((s, v) => s + v.revenue, 0);
    const videoRevenueRatioByStaff = videoRevenueByStaff.map((v) => ({
      ...v,
      percent: totalVideoRevenue > 0 ? Math.round((v.revenue / totalVideoRevenue) * 100) : 0,
    }));

    const kocRatioByTag = tagProgress.map((t) => ({
      tag: t.tag,
      count: t.count,
      percent: kols.length > 0 ? Math.round((t.count / kols.length) * 100) : 0,
    }));

    const gmvByProduct = revenueByProduct.map((p) => ({
      productId: p.key,
      name: p.name,
      gmv: p.revenue,
    }));

    // ===== NHÓM 5D =====
    // Last 21 days from "to" or today
    const endDay = to ?? new Date();
    const startDay = new Date(endDay.getTime() - 20 * 24 * 60 * 60 * 1000);
    startDay.setHours(0, 0, 0, 0);
    const days: { date: string; iso: Date }[] = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
      days.push({
        date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        iso: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      });
    }
    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const dayIndex = new Map(days.map((d, i) => [dayKey(d.iso), i]));

    // KOC search by date: số KOL được thêm vào campaign mỗi ngày (createdAt)
    const kocSearchCounts = new Array(21).fill(0) as number[];
    for (const k of kols) {
      const idx = dayIndex.get(dayKey(k.createdAt));
      if (idx != null) kocSearchCounts[idx] += 1;
    }
    const kocSearchByDate = days.map((d, i) => ({ date: d.date, count: kocSearchCounts[i] }));

    // Video by date: số contentId unique mỗi ngày (createdTime của order)
    const videoByDayMap = new Map<number, Set<string>>();
    for (const o of validOrders) {
      if (!o.contentId || !o.createdTime) continue;
      const idx = dayIndex.get(dayKey(o.createdTime));
      if (idx == null) continue;
      if (!videoByDayMap.has(idx)) videoByDayMap.set(idx, new Set());
      videoByDayMap.get(idx)!.add(o.contentId);
    }
    const videoByDate = days.map((d, i) => ({
      date: d.date,
      count: videoByDayMap.get(i)?.size ?? 0,
    }));

    return NextResponse.json({
      // NHÓM 1
      totalBookedKols: bookedCount,
      targetKocs: campaign.targetKoc,
      totalVideosWithOrders: videoSet.size,
      targetVideos: campaign.targetVideos,
      searchedKocs: kols.length,
      totalCod,
      approvedCount: bookedCount,
      videoRevenue,

      // NHÓM 2
      productProgress,
      staffProgress,
      tagProgress,

      // NHÓM 3
      contactStatus,
      collaborationStatus: { sampleSent, completed: sampleCompleted },
      staffPerformance,

      // NHÓM 4
      sampleManagement: {
        kocSent: sampleSent,
        totalCost: totalCastCost,
        paid: paidCast,
        unpaid: totalCastCost - paidCast,
      },
      revenueByTag: revenueByTag.map((r) => ({ tag: r.name, revenue: r.revenue, percent: r.percent })),
      revenueByProduct: revenueByProduct.map((r) => ({
        productId: r.key,
        name: r.name,
        revenue: r.revenue,
        percent: r.percent,
      })),
      revenueByStaff: revenueByStaff.map((r) => ({
        staffId: r.key,
        name: r.name,
        revenue: r.revenue,
        percent: r.percent,
      })),

      // NHÓM 5C
      videoRatioByStaff: videoRatioByStaffWithPct,
      videoRevenueRatioByStaff,
      kocRatioByTag,
      gmvByProduct,

      // NHÓM 5D
      kocSearchByDate,
      videoByDate,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
