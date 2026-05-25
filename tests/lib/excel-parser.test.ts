import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelBuffer } from "@/lib/excel-parser";

/**
 * Helper: build Excel buffer từ array-of-arrays (headers + rows).
 * Programmatic generation — không cần file .xlsx binary trong repo (per plan revision M1).
 */
function buildExcelBuffer(headers: string[], rows: unknown[][]): Buffer {
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const VN_HEADERS = [
  "ID đơn hàng",
  "Tên người dùng nhà sáng tạo",
  "Trạng thái đơn hàng",
  "Giá",
  "Số lượng",
  "Thời gian đã tạo",
];

describe("parseExcelBuffer", () => {
  it("happy path: parse 10 valid rows correctly", () => {
    const rows = Array.from({ length: 10 }, (_, i) => [
      `ORDER${i + 1}`,
      `creator${i + 1}`,
      "Đã giao",
      1000 * (i + 1),
      1,
      "01/05/2026 10:00:00",
    ]);
    const buf = buildExcelBuffer(VN_HEADERS, rows);
    const result = parseExcelBuffer(buf);
    expect(result.missingHeaders).toEqual([]);
    expect(result.parsed).toHaveLength(10);
    expect(result.skipped).toHaveLength(0);
    expect(result.parsed[0].orderId).toBe("ORDER1");
    expect(result.parsed[0].creatorUsername).toBe("creator1");
  });

  it("missing required header (orderId) → returns missingHeaders, no parse", () => {
    const headers = ["Tên người dùng nhà sáng tạo", "Trạng thái đơn hàng"];
    const buf = buildExcelBuffer(headers, [["creator1", "Đã giao"]]);
    const result = parseExcelBuffer(buf);
    expect(result.missingHeaders).toContain("orderId");
    expect(result.parsed).toHaveLength(0);
  });

  it("missing required header (creatorUsername) → returns missingHeaders", () => {
    const headers = ["ID đơn hàng", "Trạng thái đơn hàng"];
    const buf = buildExcelBuffer(headers, [["ORDER1", "Đã giao"]]);
    const result = parseExcelBuffer(buf);
    expect(result.missingHeaders).toContain("creatorUsername");
  });

  it("normalize username: @KolMau1 → kolmau1", () => {
    const buf = buildExcelBuffer(VN_HEADERS, [
      ["ORDER1", "@KolMau1", "Đã giao", 1000, 1, ""],
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.parsed[0].creatorUsername).toBe("kolmau1");
  });

  it("normalize username: '  Linh.123 ' → 'linh.123'", () => {
    const buf = buildExcelBuffer(VN_HEADERS, [
      ["ORDER1", "  Linh.123 ", "Đã giao", 1000, 1, ""],
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.parsed[0].creatorUsername).toBe("linh.123");
  });

  it("excel serial date number → parsed as UTC Date", () => {
    // 45413 = 2024-05-01 in Excel serial (1900 system)
    const buf = buildExcelBuffer(VN_HEADERS, [
      ["ORDER1", "kol1", "Đã giao", 1000, 1, 45413],
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.parsed[0].createdTime).toBeInstanceOf(Date);
    // Phải parse được, không null. Không check value cụ thể (Excel epoch tricky)
    expect(result.parsed[0].createdTime!.getTime()).toBeGreaterThan(0);
  });

  it("date string dd/MM/yyyy HH:mm:ss → parsed as UTC (timezone-independent)", () => {
    const buf = buildExcelBuffer(VN_HEADERS, [
      ["ORDER1", "kol1", "Đã giao", 1000, 1, "15/03/2026 14:30:00"],
    ]);
    const result = parseExcelBuffer(buf);
    const d = result.parsed[0].createdTime!;
    // Use UTC getters → test pass bất kể timezone CI server
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(2); // March
    expect(d.getUTCDate()).toBe(15);
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(30);
  });

  it("price string '1,500,000₫' → number 1500000", () => {
    const buf = buildExcelBuffer(VN_HEADERS, [
      ["ORDER1", "kol1", "Đã giao", "1,500,000₫", 1, ""],
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.parsed[0].price).toBe(1500000);
  });

  it("row missing orderId → goes to skipped with reason", () => {
    const buf = buildExcelBuffer(VN_HEADERS, [
      ["", "kol1", "Đã giao", 1000, 1, ""],
      ["ORDER2", "kol2", "Đã giao", 2000, 1, ""],
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.parsed).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/orderId/i);
    expect(result.skipped[0].rowIndex).toBe(2); // first data row in Excel
  });

  it("row missing creatorUsername → goes to skipped with reason", () => {
    const buf = buildExcelBuffer(VN_HEADERS, [
      ["ORDER1", "", "Đã giao", 1000, 1, ""],
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.parsed).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/creatorUsername/i);
  });

  it("empty file → returns empty result, no throw", () => {
    const buf = buildExcelBuffer(VN_HEADERS, []);
    const result = parseExcelBuffer(buf);
    expect(result.parsed).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.missingHeaders).toEqual([]);
  });

  it("duplicate orderId (đơn nhiều SKU) → gộp 1 row, cộng commission + quantity", () => {
    const headers = [
      "ID đơn hàng",
      "Tên người dùng nhà sáng tạo",
      "Trạng thái đơn hàng",
      "Số lượng",
      "Cơ sở hoa hồng ước tính",
      "Thanh toán hoa hồng tiêu chuẩn ước tính",
      "Thanh toán hoa hồng thực tế",
    ];
    const buf = buildExcelBuffer(headers, [
      ["ORDER1", "kol1", "Đã giao", 1, 50000, 5000, 4000],
      ["ORDER1", "kol1", "Đã giao", 2, 30000, 3000, 2500],
      ["ORDER2", "kol2", "Đã giao", 1, 20000, 2000, 1500],
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.parsed).toHaveLength(2);
    const o1 = result.parsed.find((r) => r.orderId === "ORDER1")!;
    expect(o1.quantity).toBe(3);
    expect(o1.commissionBase).toBe(80000);
    expect(o1.commissionPayment).toBe(8000);
    expect(o1.actualCommission).toBe(6500);
  });

  it("English headers also match aliases", () => {
    const enHeaders = [
      "Order ID",
      "Creator Username",
      "Order Status",
      "Price",
      "Quantity",
      "Created Time",
    ];
    const buf = buildExcelBuffer(enHeaders, [
      ["ORDER1", "kol1", "Delivered", 1000, 1, "01/05/2026"],
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.missingHeaders).toEqual([]);
    expect(result.parsed[0].orderId).toBe("ORDER1");
  });
});
