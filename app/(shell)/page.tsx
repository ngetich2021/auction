import { auth } from "@/lib/auth";
import { getListings, getListingCount } from "@/lib/queries";
import { BrowseSection } from "@/components/BrowseSection";

export default async function BrowsePage() {
  const session = await auth();

  const [listings, total] = await Promise.all([getListings(), getListingCount()]);

  return <BrowseSection initialListings={listings} initialTotal={total} session={session} />;
}
