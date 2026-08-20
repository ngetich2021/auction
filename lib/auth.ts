import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const userCount = await prisma.user.count();
      if (userCount === 1) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    },
    async signIn({ user }) {
      // Self-heals accounts that existed before the first-user-is-admin rule above was added.
      if (!user.id) return;
      const userCount = await prisma.user.count();
      if (userCount === 1) {
        await prisma.user.update({ where: { id: user.id, role: "USER" }, data: { role: "ADMIN" } }).catch(() => {});
      }
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: "USER" | "ADMIN" }).role ?? "USER";
        session.user.phone = (user as { phone?: string | null }).phone ?? null;

        const customRoleId = (user as { customRoleId?: string | null }).customRoleId ?? null;
        session.user.customRoleId = customRoleId;
        if (customRoleId) {
          const role = await prisma.customRole.findUnique({
            where: { id: customRoleId },
            include: { permissions: { select: { resource: true, action: true } } },
          });
          session.user.customRoleName = role?.name ?? null;
          session.user.permissions = role?.permissions ?? [];
        } else {
          session.user.customRoleName = null;
          session.user.permissions = [];
        }
      }
      return session;
    },
  },
});
