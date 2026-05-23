export const KOL_STATUS_LABELS: Record<string, string> = {
  PAUSED: "Tạm dừng",
  NEW_CONTACT: "Mới tiếp cận",
  CONTACTING: "Đang liên hệ",
  NEGOTIATING: "Đang đàm phán",
  BOOKED: "Đã booking",
};

export const KOL_STATUS_COLORS: Record<string, string> = {
  PAUSED: "bg-muted text-muted-foreground",
  NEW_CONTACT: "bg-primary-soft text-primary",
  CONTACTING: "bg-warning-soft text-warning",
  NEGOTIATING: "bg-warning-soft text-warning",
  BOOKED: "bg-success-soft text-success",
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
  ACTIVE: "bg-success-soft text-success",
  PAUSED: "bg-warning-soft text-warning",
  COMPLETED: "bg-muted text-muted-foreground",
};

export const CAST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

export const CAST_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-destructive-soft text-destructive",
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
