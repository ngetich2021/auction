import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getAdminStats,
  getAllUsersForAdmin,
  getAllListingsForAdmin,
  getAllOrdersForAdmin,
  getAllAdvertisementsForAdmin,
  getAllPaymentsForAdmin,
} from "@/lib/queries";
import { AdminSection } from "@/components/AdminSection";

export async function AdminContent() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const [stats, users, listings, orders, adverts, payments] = await Promise.all([
    getAdminStats(),
    getAllUsersForAdmin(),
    getAllListingsForAdmin(),
    getAllOrdersForAdmin(),
    getAllAdvertisementsForAdmin(),
    getAllPaymentsForAdmin(),
  ]);

  return <AdminSection data={{ stats, users, listings, orders, adverts, payments }} />;
}
