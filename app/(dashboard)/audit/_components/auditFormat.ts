import {
  KOL_STATUS_LABELS,
  CAMPAIGN_STATUS_LABELS,
  CAST_STATUS_LABELS,
  COST_TYPE_LABELS,
  SHIP_STATUS_LABELS,
  SAMPLE_TYPE_LABELS,
  SENT_CHANNEL_LABELS,
} from "@/lib/constants";

const FIELD_LABELS: Record<string, string> = {
  // Common
  name: "Tên",
  description: "Mô tả",
  note: "Ghi chú",
  status: "Trạng thái",
  tag: "Nhóm",
  username: "Username KOL",

  // CampaignKol
  staffId: "Nhân sự phụ trách",
  zalo: "Zalo",
  email: "Email",
  facebook: "Facebook",
  ig: "Instagram",
  campaignId: "Chiến dịch",
  createdById: "Người tạo",

  // Campaign
  startDate: "Ngày bắt đầu",
  endDate: "Ngày kết thúc",
  budget: "Ngân sách",
  targetKoc: "Mục tiêu KOC",
  targetVideo: "Mục tiêu video",

  // Cast cost
  amount: "Số tiền",
  costType: "Loại chi phí",
  rejectReason: "Lý do từ chối",
  approvedAt: "Thời gian duyệt",
  approvedById: "Người duyệt",

  // Sent order
  channel: "Kênh gửi",
  sampleType: "Loại hàng mẫu",
  shipStatus: "Trạng thái giao",
  trackingNumber: "Mã vận đơn",
  productId: "Sản phẩm",
  quantity: "Số lượng",
  shippedAt: "Thời gian gửi",
  deliveredAt: "Thời gian nhận",

  // Product
  price: "Giá",
  sku: "SKU",

  // User
  role: "Vai trò",

  // Video
  url: "URL video",
  views: "Lượt xem",
  orderCount: "Số đơn",

  // Excel import
  filename: "Tên file",
  rowCount: "Số dòng",
};

const FIELD_VALUE_MAP: Record<string, Record<string, string>> = {
  status: {
    ...KOL_STATUS_LABELS,
    ...CAMPAIGN_STATUS_LABELS,
    ...CAST_STATUS_LABELS,
  },
  costType: COST_TYPE_LABELS,
  shipStatus: SHIP_STATUS_LABELS,
  sampleType: SAMPLE_TYPE_LABELS,
  channel: SENT_CHANNEL_LABELS,
  role: { MANAGER: "Quản lý", STAFF: "Nhân viên" },
};

// Fields to hide from diff (system/meta or unstable IDs)
const HIDDEN_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "campaignKolId",
]);

const DATE_FIELDS = new Set([
  "startDate",
  "endDate",
  "approvedAt",
  "shippedAt",
  "deliveredAt",
  "proposedAt",
]);

const MONEY_FIELDS = new Set(["amount", "budget", "price"]);

const NUMBER_FIELDS = new Set([
  "targetKoc",
  "targetVideo",
  "quantity",
  "views",
  "orderCount",
  "rowCount",
]);

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

export function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";

  // Enum translation
  const valueMap = FIELD_VALUE_MAP[key];
  if (valueMap && typeof value === "string" && valueMap[value]) {
    return valueMap[value];
  }

  // Date
  if (DATE_FIELDS.has(key) && typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  // Money
  if (MONEY_FIELDS.has(key) && typeof value === "number") {
    return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
  }

  // Number
  if (NUMBER_FIELDS.has(key) && typeof value === "number") {
    return new Intl.NumberFormat("vi-VN").format(value);
  }

  // Boolean
  if (typeof value === "boolean") return value ? "Có" : "Không";

  // Object/array — fallback
  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export type DiffEntry = {
  field: string;
  label: string;
  before: string;
  after: string;
};

export function computeDiff(
  before: unknown,
  after: unknown
): DiffEntry[] {
  const b =
    (before && typeof before === "object" ? (before as Record<string, unknown>) : {}) ||
    {};
  const a =
    (after && typeof after === "object" ? (after as Record<string, unknown>) : {}) ||
    {};
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  const out: DiffEntry[] = [];
  for (const k of keys) {
    if (HIDDEN_FIELDS.has(k)) continue;
    const beforeV = b[k];
    const afterV = a[k];
    if (jsonEqual(beforeV, afterV)) continue;
    out.push({
      field: k,
      label: fieldLabel(k),
      before: formatFieldValue(k, beforeV),
      after: formatFieldValue(k, afterV),
    });
  }
  return out;
}

export function listFields(
  data: unknown
): { field: string; label: string; value: string }[] {
  const d =
    (data && typeof data === "object" ? (data as Record<string, unknown>) : {}) ||
    {};
  return Object.keys(d)
    .filter((k) => !HIDDEN_FIELDS.has(k))
    .filter((k) => {
      const v = d[k];
      return v !== null && v !== undefined && v !== "";
    })
    .map((k) => ({
      field: k,
      label: fieldLabel(k),
      value: formatFieldValue(k, d[k]),
    }));
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") return JSON.stringify(a) === JSON.stringify(b);
  return false;
}
