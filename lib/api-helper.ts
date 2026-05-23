import { NextResponse } from "next/server";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "UNAUTHORIZED") return apiError("Chưa đăng nhập", 401);
    if (err.message === "FORBIDDEN") return apiError("Không có quyền", 403);
    return apiError(err.message, 500);
  }
  return apiError("Lỗi không xác định", 500);
}
