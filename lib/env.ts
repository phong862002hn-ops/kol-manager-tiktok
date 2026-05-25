import { z } from "zod";

/**
 * Validate env vars khi app khởi động.
 * Import file này ở module khởi động sớm (vd lib/prisma.ts) để fail-fast.
 *
 * Plan Slice 3: app phải boot FAIL ngay với error rõ nếu env var sai/thiếu.
 *
 * Lưu ý build-time:
 *   Next.js build (`next build`) load route handlers để collect page data nhưng
 *   không có env vars. Skip strict validation ở phase build để build không fail.
 *   Runtime sẽ vẫn validate.
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET phải >= 32 ký tự"),
  NEXTAUTH_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

type Env = z.infer<typeof schema>;

function validateAtRuntime(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.error(`❌ Env validation failed:\n${issues}\n\nFix .env (hoặc .env.docker) rồi restart app.`);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

// Bypass strict validation ở Next.js build phase (NEXT_PHASE=phase-production-build).
// Runtime (server start, route handler call) vẫn validate đầy đủ.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

export const env: Env = isBuildPhase
  ? {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://build-placeholder@localhost:5432/build",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "build-phase-placeholder-secret-not-for-runtime-use",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://build-placeholder.local",
      NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) ?? "production",
    }
  : validateAtRuntime();
