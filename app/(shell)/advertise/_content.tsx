import { auth } from "@/lib/auth";
import { getMyListings, getUserAdvertisements } from "@/lib/queries";
import { AdvertiseSection } from "@/components/AdvertiseSection";

export async function AdvertiseContent() {
  const session = await auth();

  const [myListings, myAds] = await Promise.all([
    session?.user ? getMyListings(session.user.id) : Promise.resolve([]),
    session?.user ? getUserAdvertisements(session.user.id) : Promise.resolve([]),
  ]);

  return <AdvertiseSection session={session} myListings={myListings} myAds={myAds} />;
}
