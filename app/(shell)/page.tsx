import { auth } from "@/lib/auth";
import { getListings } from "@/lib/queries";
import { BrowseSection } from "@/components/BrowseSection";

export const revalidate = 5;

export default async function BrowsePage() {
  const [session, listings] = await Promise.all([auth(), getListings()]);

  return <BrowseSection initialListings={listings} session={session} />;
}
