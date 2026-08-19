import { auth } from "@/lib/auth";
import { SettingsSection } from "@/components/SettingsSection";

export async function SettingsContent() {
  const session = await auth();

  return <SettingsSection session={session} />;
}
