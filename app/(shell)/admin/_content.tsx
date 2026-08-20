import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getAdminStats,
  getAllUsersForAdmin,
  getAllListingsForAdmin,
  getAllOrdersForAdmin,
  getAllAdvertisementsForAdmin,
  getAllPaymentsForAdmin,
  getAllRolesForAdmin,
} from "@/lib/queries";
import { hasPermission } from "@/lib/permissions";
import { AdminSection } from "@/components/AdminSection";

export async function AdminContent() {
  const session = await auth();
  const isSuperAdmin = session?.user.role === "ADMIN";
  const isScopedAdmin = !!session?.user.customRoleId && session.user.permissions.length > 0;
  if (!session?.user || (!isSuperAdmin && !isScopedAdmin)) {
    redirect("/");
  }

  const permissions = session.user.permissions;
  const canRead = (resource: "users" | "listings" | "adverts" | "orders" | "payments") =>
    isSuperAdmin || hasPermission(permissions, resource, "READ");

  const [stats, users, listings, orders, adverts, payments, roles] = await Promise.all([
    isSuperAdmin ? getAdminStats() : null,
    canRead("users") ? getAllUsersForAdmin() : [],
    canRead("listings") ? getAllListingsForAdmin() : [],
    canRead("orders") ? getAllOrdersForAdmin() : [],
    canRead("adverts") ? getAllAdvertisementsForAdmin() : [],
    canRead("payments") ? getAllPaymentsForAdmin() : [],
    isSuperAdmin ? getAllRolesForAdmin() : [],
  ]);

  return (
    <AdminSection
      data={{ stats, users, listings, orders, adverts, payments, roles }}
      access={{ isSuperAdmin, permissions }}
    />
  );
}
