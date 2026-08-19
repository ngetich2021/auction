import { auth } from "@/lib/auth";
import { getOrdersForBuyer, getOrdersForSeller } from "@/lib/queries";
import { OrdersSection } from "@/components/OrdersSection";

export async function OrdersContent() {
  const session = await auth();

  const [buyerOrders, sellerOrders] = await Promise.all([
    session?.user ? getOrdersForBuyer(session.user.id) : Promise.resolve([]),
    session?.user ? getOrdersForSeller(session.user.id) : Promise.resolve([]),
  ]);

  return <OrdersSection session={session} buyerOrders={buyerOrders} sellerOrders={sellerOrders} />;
}
