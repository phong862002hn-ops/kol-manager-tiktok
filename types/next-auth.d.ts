import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "STAFF" | "MANAGER";
    } & DefaultSession["user"];
  }
  interface User {
    role: "STAFF" | "MANAGER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "STAFF" | "MANAGER";
  }
}
