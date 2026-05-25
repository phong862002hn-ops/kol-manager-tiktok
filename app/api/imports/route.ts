import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { handleApiError, apiError } from "@/lib/api-helper";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    await requireSession();
    const imports = await prisma.excelImport.findMany({
      where: { deletedAt: null },
      orderBy: { uploadedAt: "desc" },
      take: 100,
    });
    return NextResponse.json(imports);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return apiError("Thiếu file");
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const result = parseExcelBuffer(buf);

    // Slice 6: file thiếu header bắt buộc → 400 với detail
    if (result.missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `File thiếu các cột bắt buộc: ${result.missingHeaders.join(", ")}`,
          code: "MISSING_HEADERS",
          missingHeaders: result.missingHeaders,
        },
        { status: 400 }
      );
    }

    const { parsed: rows, skipped } = result;
    if (rows.length === 0) {
      return apiError("File không có dòng nào hợp lệ (tất cả bị skip)");
    }

    const imp = await prisma.excelImport.create({
      data: {
        fileName: file.name,
        uploadedBy: session.user.name ?? session.user.email ?? "Unknown",
        uploaderId: session.user.id,
        rowCount: rows.length,
      },
    });

    // Slice 9: idempotent import — upsert by orderId.
    // Query existing → split create vs update → batch.
    // Lý do không dùng prisma.tiktokOrder.upsert mỗi row: 1000 round-trip quá chậm.
    const orderIds = rows.map((r) => r.orderId);
    let created = 0;
    let updated = 0;

    const QUERY_CHUNK = 1000;
    const existingSet = new Set<string>();
    for (let i = 0; i < orderIds.length; i += QUERY_CHUNK) {
      const chunk = orderIds.slice(i, i + QUERY_CHUNK);
      const existing = await prisma.tiktokOrder.findMany({
        where: { orderId: { in: chunk } },
        select: { orderId: true },
      });
      for (const e of existing) existingSet.add(e.orderId);
    }

    const toCreate = rows.filter((r) => !existingSet.has(r.orderId));
    const toUpdate = rows.filter((r) => existingSet.has(r.orderId));

    // Batch insert mới
    const INSERT_CHUNK = 500;
    for (let i = 0; i < toCreate.length; i += INSERT_CHUNK) {
      const chunk = toCreate.slice(i, i + INSERT_CHUNK);
      await prisma.tiktokOrder.createMany({
        skipDuplicates: true,
        data: chunk.map((r) => ({
          importId: imp.id,
          orderId: r.orderId,
          productId: r.productId,
          productName: r.productName,
          sku: r.sku,
          skuId: r.skuId,
          merchantSku: r.merchantSku,
          price: r.price,
          paymentAmount: r.paymentAmount,
          quantity: r.quantity,
          paymentMethod: r.paymentMethod,
          orderStatus: r.orderStatus,
          creatorUsername: r.creatorUsername,
          contentType: r.contentType,
          contentId: r.contentId,
          commissionRate: r.commissionRate,
          commissionBase: r.commissionBase,
          commissionPayment: r.commissionPayment,
          actualCommission: r.actualCommission,
          createdTime: r.createdTime,
          paidTime: r.paidTime,
          shippedTime: r.shippedTime,
          completedTime: r.completedTime,
          rawData: r.rawData as Prisma.InputJsonValue,
        })),
      });
      created += chunk.length;
    }

    // Update từng cái với data mới (giữ nguyên importId cũ — KHÔNG đè).
    // Lý do: giữ relation lịch sử với import gốc → không break audit "đơn này từ file nào".
    for (const r of toUpdate) {
      await prisma.tiktokOrder.update({
        where: { orderId: r.orderId },
        data: {
          productName: r.productName,
          sku: r.sku,
          skuId: r.skuId,
          merchantSku: r.merchantSku,
          price: r.price,
          paymentAmount: r.paymentAmount,
          quantity: r.quantity,
          paymentMethod: r.paymentMethod,
          orderStatus: r.orderStatus,
          // creatorUsername KHÔNG update — username từng được normalize, không nên ghi đè
          contentType: r.contentType,
          contentId: r.contentId,
          commissionRate: r.commissionRate,
          commissionBase: r.commissionBase,
          commissionPayment: r.commissionPayment,
          actualCommission: r.actualCommission,
          createdTime: r.createdTime,
          paidTime: r.paidTime,
          shippedTime: r.shippedTime,
          completedTime: r.completedTime,
          rawData: r.rawData as Prisma.InputJsonValue,
        },
      });
      updated += 1;
    }

    const uniqueCreators = new Set(rows.map((r) => r.creatorUsername)).size;
    await logAudit({
      user: { id: session.user.id, email: session.user.email!, name: session.user.name! },
      action: "CREATE",
      entity: "ExcelImport",
      entityId: imp.id,
      entityName: `${imp.fileName} (${imp.rowCount} dòng — ${created} mới, ${updated} cập nhật)`,
      after: { fileName: imp.fileName, rowCount: imp.rowCount, uniqueCreators, created, updated, skippedCount: skipped.length },
    });

    return NextResponse.json({
      id: imp.id,
      fileName: imp.fileName,
      summary: {
        created,
        updated,
        skipped: skipped.length,
        total: rows.length,
      },
      uniqueCreators,
      skipped: skipped.slice(0, 50),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
