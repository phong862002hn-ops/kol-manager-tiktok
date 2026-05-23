import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { isCancelledOrder, KOL_STATUS_LABELS, CAST_STATUS_LABELS, COST_TYPE_LABELS } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(_: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireSession();

    const campaign = await prisma.campaign.findUnique({
      where: { id: ctx.params.id },
      include: {
        kols: { include: { castCost: true }, orderBy: { username: "asc" } },
      },
    });
    if (!campaign) return apiError("Không tìm thấy", 404);

    const usernames = campaign.kols.map((k) => k.username);
    const orders =
      usernames.length === 0
        ? []
        : await prisma.tiktokOrder.findMany({
            where: {
              creatorUsername: { in: usernames, mode: "insensitive" },
              import: { deletedAt: null },
            },
            select: {
              creatorUsername: true,
              orderStatus: true,
              commissionBase: true,
              commissionPayment: true,
              actualCommission: true,
              contentId: true,
            },
          });

    type KolStats = {
      orders: number;
      revenue: number;
      commission: number;
      actualCommission: number;
      videos: Set<string>;
    };
    const statsMap = new Map<string, KolStats>();
    for (const u of usernames) {
      statsMap.set(u.toLowerCase(), {
        orders: 0,
        revenue: 0,
        commission: 0,
        actualCommission: 0,
        videos: new Set(),
      });
    }
    for (const o of orders) {
      const s = statsMap.get(o.creatorUsername.toLowerCase());
      if (!s || isCancelledOrder(o.orderStatus)) continue;
      s.orders += 1;
      // Doanh thu = Cơ sở hoa hồng
      s.revenue += o.commissionBase ?? 0;
      s.commission += o.commissionPayment ?? 0;
      s.actualCommission += o.actualCommission ?? 0;
      if (o.contentId) s.videos.add(o.contentId);
    }

    // Sheet 1: Tổng quan campaign
    const totalRev = Array.from(statsMap.values()).reduce((s, v) => s + v.revenue, 0);
    const totalComm = Array.from(statsMap.values()).reduce((s, v) => s + v.commission, 0);
    const approvedCast = campaign.kols.reduce(
      (s, k) => s + (k.castCost?.status === "APPROVED" ? k.castCost.amount : 0),
      0
    );

    const summarySheet = XLSX.utils.json_to_sheet([
      { Trường: "Tên chiến dịch", "Giá trị": campaign.name },
      { Trường: "Mô tả", "Giá trị": campaign.description ?? "" },
      { Trường: "Trạng thái", "Giá trị": campaign.status },
      { Trường: "Bắt đầu", "Giá trị": campaign.startDate?.toLocaleDateString("vi-VN") ?? "" },
      { Trường: "Kết thúc", "Giá trị": campaign.endDate?.toLocaleDateString("vi-VN") ?? "" },
      { Trường: "Budget (VND)", "Giá trị": campaign.budget },
      { Trường: "Target KOL", "Giá trị": campaign.targetKoc },
      { Trường: "Số KOL hiện tại", "Giá trị": campaign.kols.length },
      { Trường: "Tổng đơn hợp lệ", "Giá trị": Array.from(statsMap.values()).reduce((s, v) => s + v.orders, 0) },
      { Trường: "Tổng doanh thu (VND)", "Giá trị": totalRev },
      { Trường: "Tổng hoa hồng (VND)", "Giá trị": totalComm },
      { Trường: "Chi phí cast đã duyệt (VND)", "Giá trị": approvedCast },
      { Trường: "Lợi nhuận (VND)", "Giá trị": totalRev - totalComm - approvedCast },
    ]);

    // Sheet 2: Ranking KOL
    const kolRanking = campaign.kols
      .map((k) => {
        const s = statsMap.get(k.username.toLowerCase())!;
        const cast = k.castCost?.status === "APPROVED" ? k.castCost.amount : 0;
        return {
          Username: k.username,
          Tag: k.tag ?? "",
          "Trạng thái": KOL_STATUS_LABELS[k.status],
          Zalo: k.zalo ?? "",
          Email: k.email ?? "",
          Facebook: k.facebook ?? "",
          Instagram: k.ig ?? "",
          "Số đơn": s.orders,
          "Số video": s.videos.size,
          "Doanh thu": s.revenue,
          "Hoa hồng": s.commission,
          "Cast đề xuất": k.castCost?.amount ?? 0,
          "Loại cast": k.castCost ? COST_TYPE_LABELS[k.castCost.costType] : "",
          "Trạng thái cast": k.castCost ? CAST_STATUS_LABELS[k.castCost.status] : "",
          "Cast đã thanh toán": k.castCost?.paidAmount ?? 0,
          "Lợi nhuận": s.revenue - s.commission - cast,
        };
      })
      .sort((a, b) => b["Doanh thu"] - a["Doanh thu"]);
    const rankingSheet = XLSX.utils.json_to_sheet(kolRanking);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, "Tổng quan");
    XLSX.utils.book_append_sheet(wb, rankingSheet, "Ranking KOL");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const safeName = campaign.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `campaign_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
