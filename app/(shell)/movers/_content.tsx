import { auth } from "@/lib/auth";
import { getMovers, getMyMovers } from "@/lib/queries";
import { MoversSection } from "@/components/MoversSection";

export async function MoversContent() {
  const session = await auth();

  const [movers, myMovers] = await Promise.all([
    getMovers(),
    session?.user ? getMyMovers(session.user.id) : Promise.resolve([]),
  ]);

  return <MoversSection session={session} initialMovers={movers} myMovers={myMovers} />;
}
