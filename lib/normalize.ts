/**
 * Chuẩn hóa username KOL về dạng lowercase, không có `@` prefix, đã trim.
 * Dùng làm canonical form cho mọi điểm WRITE vào DB và INPUT của query.
 *
 * KHÔNG dùng cho giá trị ĐỌC RA từ DB (data cũ có thể chưa normalize).
 */
export function normalizeUsername(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/^@/, "").toLowerCase();
}
