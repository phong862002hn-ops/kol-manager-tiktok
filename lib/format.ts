export function formatVnd(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function normalizeUsername(u: string): string {
  return u.trim().toLowerCase().replace(/^@/, "");
}

export function shortOrderId(id: string): string {
  return id.length > 8 ? id.slice(-8) : id;
}
