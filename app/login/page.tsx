import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginCard } from "@/components/LoginCard";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
      <LoginCard />
    </main>
  );
}
