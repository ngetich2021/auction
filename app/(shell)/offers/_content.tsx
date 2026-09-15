import { auth } from "@/lib/auth";
import { getOffers, getMyOffers } from "@/lib/queries";
import { OffersSection } from "@/components/OffersSection";

export async function OffersContent() {
  const session = await auth();

  const [offers, myOffers] = await Promise.all([
    getOffers(),
    session?.user ? getMyOffers(session.user.id) : Promise.resolve([]),
  ]);

  return <OffersSection session={session} initialOffers={offers} myOffers={myOffers} />;
}
