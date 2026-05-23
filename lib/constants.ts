export const KOL_STATUS_LABELS: Record<string, string> = {
  PAUSED: "Tạm dừng",
  NEW_CONTACT: "Mới tiếp cận",
  CONTACTING: "Đang liên hệ",
  NEGOTIATING: "Đang đàm phán",
  BOOKED: "Đã booking",
};

export const KOL_STATUS_COLORS: Record<string, string> = {
  PAUSED: "bg-gray-100 text-gray-700",
  NEW_CONTACT: "bg-blue-100 text-blue-700",
  CONTACTING: "bg-yellow-100 text-yellow-700",
  NEGOTIATING: "bg-orange-100 text-orange-700",
  BOOKED: "bg-green-100 text-green-700",
};

export const KOL_STATUS_ORDER = [
  "PAUSED",
  "NEW_CONTACT",
  "CONTACTING",
  "NEGOTIATING",
  "BOOKED",
] as const;

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn thành",
};

export const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-gray-100 text-gray-700",
};

export const CAST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

export const CAST_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export const COST_TYPE_LABELS: Record<string, string> = {
  PER_VIDEO: "Mỗi video",
  LUMP_SUM: "Cả campaign",
};

export const SHIP_STATUS_LABELS: Record<string, string> = {
  NOT_SENT: "Chưa gửi",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã nhận",
  RETURNED: "Hoàn về",
};

export const SAMPLE_TYPE_LABELS: Record<string, string> = {
  GIFT: "Tặng",
  LOAN: "Mượn",
};

export const SENT_CHANNEL_LABELS: Record<string, string> = {
  TIKTOK: "TikTok",
  EXTERNAL: "Ngoài sàn",
};

export const CANCELLED_ORDER_STATUSES = ["Đã hủy", "Hủy"];

export function isCancelledOrder(status: string | null | undefined): boolean {
  if (!status) return false;
  return CANCELLED_ORDER_STATUSES.some((s) => status.includes(s));
}
