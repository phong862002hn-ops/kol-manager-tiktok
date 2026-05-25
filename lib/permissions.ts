import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new UnauthorizedError();
  return session;
}

export async function requireManager() {
  const session = await requireSession();
  if (session.user.role !== "MANAGER") throw new ForbiddenError();
  return session;
}

/**
 * Kiểm tra quyền xóa entity.
 * - MANAGER: xóa được mọi entity.
 * - STAFF: chỉ xóa được entity họ tạo (createdById === user.id).
 *   Nếu entity không có createdById (data cũ trước khi có field này) → Manager-only.
 *
 * Throw ForbiddenError nếu không đủ quyền.
 */
export async function requireDeletePermission(entityCreatedById: string | null) {
  const session = await requireSession();
  if (session.user.role === "MANAGER") return session;
  if (entityCreatedById && session.user.id === entityCreatedById) return session;
  throw new ForbiddenError();
}

/**
 * Slice 10: Quyền UPDATE entity. Same rule as delete:
 * - MANAGER: update bất kỳ
 * - STAFF: chỉ update entity họ tạo
 */
export async function requireUpdatePermission(entityCreatedById: string | null) {
  const session = await requireSession();
  if (session.user.role === "MANAGER") return session;
  if (entityCreatedById && session.user.id === entityCreatedById) return session;
  throw new ForbiddenError();
}
