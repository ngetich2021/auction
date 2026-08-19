import { auth } from "@/lib/auth";
import { getMyListings } from "@/lib/queries";
import { PostSection } from "@/components/PostSection";
import { MyListingsTable } from "@/components/MyListingsTable";

export async function PostContent() {
  const session = await auth();
  const myListings = session?.user ? await getMyListings(session.user.id) : [];

  return (
    <div className="flex flex-col gap-6 p-4">
      <PostSection session={session} />
      {session && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">My listings</h3>
          <MyListingsTable listings={myListings} />
        </div>
      )}
    </div>
  );
}
