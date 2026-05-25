import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  // Typed AppError (Slice 4) — status code đi cùng error
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  // Zod validation
  if (err instanceof ZodError) {
    const msg = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: msg || "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  // Backward compat — legacy string-based errors trong route code cũ chưa migrate
  if (err instanceof Error) {
    if (err.message === "UNAUTHORIZED") return apiError("Chưa đăng nhập", 401);
    if (err.message === "FORBIDDEN") return apiError("Không có quyền", 403);
    // eslint-disable-next-line no-console
    console.error("[api-error]", err);
    return apiError(err.message, 500);
  }
  // eslint-disable-next-line no-console
  console.error("[api-error] unknown:", err);
  return apiError("Lỗi không xác định", 500);
}
