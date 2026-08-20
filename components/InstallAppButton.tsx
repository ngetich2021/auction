"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Lazy-initialized so it reads matchMedia at most once and never during SSR; this component
  // always renders the same button markup regardless, so there's nothing to hydrate-mismatch.
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
  );
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    if (!deferredPrompt) {
      setShowInstructions(true);
      return;
    }
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Install app" onClick={handleInstall} className="size-8">
        <Download className="size-4" />
      </Button>

      {showInstructions && (
        <Modal onClose={() => setShowInstructions(false)}>
          <div className="flex flex-col gap-3 p-4 text-sm">
            <h3 className="text-base font-semibold">Install this app</h3>
            <p className="text-zinc-500">
              Your browser doesn&apos;t support one-tap install here, but you can still add it to your home screen:
            </p>
            <ul className="list-disc space-y-1 pl-4 text-zinc-600 dark:text-zinc-400">
              <li>
                <strong>iPhone/iPad (Safari):</strong> tap the Share icon, then &quot;Add to Home Screen&quot;.
              </li>
              <li>
                <strong>Android (Chrome):</strong> open the ⋮ menu, then &quot;Install app&quot; or &quot;Add to
                Home screen&quot;.
              </li>
              <li>
                <strong>Desktop (Chrome/Edge):</strong> click the install icon in the address bar, or open the
                browser menu and choose &quot;Install&quot;.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="self-end rounded-full bg-zinc-100 dark:bg-zinc-800 px-4 py-1.5 text-xs font-medium"
            >
              Got it
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
