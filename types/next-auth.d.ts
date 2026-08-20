import { DefaultSession } from "next-auth";
import type { SessionPermission } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      phone: string | null;
      customRoleId: string | null;
      customRoleName: string | null;
      permissions: SessionPermission[];
    } & DefaultSession["user"];
  }
}
