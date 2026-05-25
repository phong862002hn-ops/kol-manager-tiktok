/**
 * Typed error classes — throw từ business logic, handle ở api-helper.
 * Slice 4: thay `throw new Error("UNAUTHORIZED")` bằng typed error có status code.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Chưa đăng nhập") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Không có quyền") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Không tìm thấy") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Dữ liệu không hợp lệ") {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Xung đột dữ liệu") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}
