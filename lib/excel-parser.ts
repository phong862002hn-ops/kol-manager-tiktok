import * as XLSX from "xlsx";
import { normalizeUsername } from "@/lib/normalize";

export type ParsedRow = {
  orderId: string;
  productId: string;
  productName: string;
  sku: string | null;
  skuId: string | null;
  merchantSku: string | null;
  price: number;
  paymentAmount: number;
  quantity: number;
  paymentMethod: string | null;
  orderStatus: string;
  creatorUsername: string;
  contentType: string | null;
  contentId: string | null;
  commissionRate: number | null;
  commissionBase: number | null;
  commissionPayment: number | null;
  actualCommission: number | null;
  createdTime: Date | null;
  paidTime: Date | null;
  shippedTime: Date | null;
  completedTime: Date | null;
  rawData: Record<string, unknown>;
};

// Slice 6: kết quả parse có cấu trúc — user biết bao nhiêu dòng pass, bao nhiêu skip, lý do.
export type SkippedRow = {
  rowIndex: number; // 1-based, theo Excel row number (data starts at row 2)
  reason: string;
  row: Record<string, unknown>;
};

export type ParseResult = {
  parsed: ParsedRow[];
  skipped: SkippedRow[];
  missingHeaders: string[]; // tên field chuẩn (orderId / creatorUsername / orderStatus) bị thiếu trong Excel
};

// Slice 6: header bắt buộc — file thiếu một trong các header này → reject 400, không parse.
const REQUIRED_HEADERS = ["orderId", "creatorUsername", "orderStatus"] as const;

// Map nhiều biến thể của tên cột tiếng Việt → key chuẩn
const COL_ALIASES: Record<string, string[]> = {
  orderId: ["ID đơn hàng", "Order ID", "Mã đơn hàng"],
  productId: ["ID sản phẩm", "Product ID"],
  productName: ["Tên sản phẩm", "Product Name"],
  sku: ["Sku", "SKU"],
  skuId: ["Id Sku", "SKU ID"],
  merchantSku: ["Sku người bán", "Seller SKU"],
  price: ["Giá", "Price"],
  paymentAmount: ["Payment Amount", "Số tiền thanh toán", "Thanh toán"],
  quantity: ["Số lượng", "Quantity"],
  paymentMethod: ["Phương thức thanh toán", "Payment Method"],
  orderStatus: ["Trạng thái đơn hàng", "Order Status"],
  creatorUsername: [
    "Tên người dùng nhà sáng tạo",
    "Tên người dùng Người sáng tạo",
    "Creator Username",
    "Username",
  ],
  contentType: ["Loại nội dung", "Content Type"],
  contentId: ["Id nội dung", "ID nội dung", "Content ID"],
  commissionRate: ["Tỷ lệ hoa hồng tiêu chuẩn", "Commission Rate"],
  commissionBase: ["Cơ sở hoa hồng ước tính", "Commission Base"],
  commissionPayment: [
    "Thanh toán hoa hồng tiêu chuẩn ước tính",
    "Commission Payment",
  ],
  actualCommission: [
    "Thanh toán hoa hồng thực tế",
    "Actual Commission",
  ],
  createdTime: ["Thời gian đã tạo", "Created Time"],
  paidTime: ["Thời gian thanh toán", "Paid Time"],
  shippedTime: ["Thời gian sẵn sàng vận chuyển", "Shipped Time"],
  completedTime: ["Thời gian hoàn thành đơn hàng", "Completed Time"],
};

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHeaderMap(headers: string[]): Map<string, string> {
  const m = new Map<string, string>();
  const normalizedHeaders = headers.map((h) => normalizeKey(h ?? ""));
  for (const [target, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalizedHeaders.indexOf(normalizeKey(alias));
      if (idx >= 0) {
        m.set(target, headers[idx]);
        break;
      }
    }
  }
  return m;
}

function parseInt0(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[,\s₫]/g, ""));
  return isNaN(n) ? 0 : Math.round(n);
}

function parseIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[,\s₫]/g, ""));
  return isNaN(n) ? null : Math.round(n);
}

function parseFloatOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const s = String(v).replace(/[%\s]/g, "");
  const n = typeof v === "number" ? v : parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseStrOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// "dd/MM/yyyy HH:mm:ss" hoặc Excel date number
function parseDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(v);
    if (!date) return null;
    return new Date(Date.UTC(date.y, date.m - 1, date.d, date.H, date.M, date.S));
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    const [, d, mo, y, h, mi, se] = m;
    // Slice 13: parse UTC (consistent với Excel serial date parser ở trên,
    // tránh timezone-dependent: server VN vs server US sẽ ra UTC khác nhau).
    return new Date(Date.UTC(
      parseInt(y),
      parseInt(mo) - 1,
      parseInt(d),
      parseInt(h ?? "0"),
      parseInt(mi ?? "0"),
      parseInt(se ?? "0")
    ));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function parseExcelBuffer(buf: Buffer): ParseResult {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { parsed: [], skipped: [], missingHeaders: [] };
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  if (rawRows.length === 0) return { parsed: [], skipped: [], missingHeaders: [] };

  const headers = Object.keys(rawRows[0]);
  const headerMap = buildHeaderMap(headers);

  // Slice 6: kiểm tra header bắt buộc trước khi parse từng dòng
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headerMap.has(h));
  if (missingHeaders.length > 0) {
    return { parsed: [], skipped: [], missingHeaders: [...missingHeaders] };
  }

  const parsed: ParsedRow[] = [];
  const skipped: SkippedRow[] = [];
  // Slice 15: dedup orderId trùng — file TikTok export 1 dòng/SKU,
  // đơn nhiều sản phẩm = nhiều dòng cùng orderId. Schema unique([orderId])
  // → trước đây createMany throw "Unique constraint failed" → cả file fail.
  // Giải pháp: gộp các dòng cùng orderId, cộng commission* + quantity.
  const orderIndex = new Map<string, number>();

  rawRows.forEach((row, idx) => {
    const get = (key: string) => {
      const col = headerMap.get(key);
      return col ? row[col] : undefined;
    };
    const creator = normalizeUsername(parseStrOrNull(get("creatorUsername")));
    const orderId = String(get("orderId") ?? "").trim();
    const excelRow = idx + 2; // header là row 1, data từ row 2

    if (!orderId) {
      skipped.push({ rowIndex: excelRow, reason: "Thiếu orderId", row });
      return;
    }
    if (!creator) {
      skipped.push({ rowIndex: excelRow, reason: "Thiếu creatorUsername", row });
      return;
    }

    const existingIdx = orderIndex.get(orderId);
    if (existingIdx !== undefined) {
      // Cùng orderId → merge vào row đã có. Cộng số lượng + commission*, giữ
      // first cho text/date (đã được set ở row đầu tiên).
      const prev = parsed[existingIdx];
      prev.quantity += parseInt0(get("quantity")) || 1;
      const cb = parseIntOrNull(get("commissionBase"));
      if (cb != null) prev.commissionBase = (prev.commissionBase ?? 0) + cb;
      const cp = parseIntOrNull(get("commissionPayment"));
      if (cp != null) prev.commissionPayment = (prev.commissionPayment ?? 0) + cp;
      const ac = parseIntOrNull(get("actualCommission"));
      if (ac != null) prev.actualCommission = (prev.actualCommission ?? 0) + ac;
      return;
    }

    orderIndex.set(orderId, parsed.length);
    parsed.push({
      orderId,
      productId: String(get("productId") ?? "").trim(),
      productName: String(get("productName") ?? "").trim(),
      sku: parseStrOrNull(get("sku")),
      skuId: parseStrOrNull(get("skuId")),
      merchantSku: parseStrOrNull(get("merchantSku")),
      price: parseInt0(get("price")),
      paymentAmount: parseInt0(get("paymentAmount")),
      quantity: parseInt0(get("quantity")) || 1,
      paymentMethod: parseStrOrNull(get("paymentMethod")),
      orderStatus: String(get("orderStatus") ?? "").trim() || "—",
      creatorUsername: creator,
      contentType: parseStrOrNull(get("contentType")),
      contentId: parseStrOrNull(get("contentId")),
      commissionRate: parseFloatOrNull(get("commissionRate")),
      commissionBase: parseIntOrNull(get("commissionBase")),
      commissionPayment: parseIntOrNull(get("commissionPayment")),
      actualCommission: parseIntOrNull(get("actualCommission")),
      createdTime: parseDate(get("createdTime")),
      paidTime: parseDate(get("paidTime")),
      shippedTime: parseDate(get("shippedTime")),
      completedTime: parseDate(get("completedTime")),
      rawData: row,
    });
  });

  return { parsed, skipped, missingHeaders: [] };
}
