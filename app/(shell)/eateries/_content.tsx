import { auth } from "@/lib/auth";
import { getEateries, getMyEateries } from "@/lib/queries";
import { EateriesSection } from "@/components/EateriesSection";

export async function EateriesContent() {
  const session = await auth();

  const [eateries, myEateries] = await Promise.all([
    getEateries(),
    session?.user ? getMyEateries(session.user.id) : Promise.resolve([]),
  ]);

  return <EateriesSection session={session} initialEateries={eateries} myEateries={myEateries} />;
}
