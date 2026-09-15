import { auth } from "@/lib/auth";
import { getActivePromoVideos } from "@/lib/queries";
import { Header } from "@/components/Header";
import { NavBar } from "@/components/NavBar";
import { GlobalLocationProvider } from "@/components/GlobalLocationProvider";
import { GlobalLocationBar } from "@/components/GlobalLocationBar";
import { AssistantWidget } from "@/components/AssistantWidget";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const [session, promoVideos] = await Promise.all([auth(), getActivePromoVideos()]);
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user.role === "ADMIN" || !!session?.user.customRoleId;

  return (
    <GlobalLocationProvider>
      <div className="flex min-h-screen flex-1 flex-col">
        <Header session={session} promoVideos={promoVideos} />
        <GlobalLocationBar />
        <NavBar isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
      <AssistantWidget />
    </GlobalLocationProvider>
  );
}
