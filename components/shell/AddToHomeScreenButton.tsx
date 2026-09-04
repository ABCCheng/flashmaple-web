"use client";

import { Share, SquarePlus } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useLocaleContext } from "@/components/providers/locale-provider";
import { AppModal } from "@/components/app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/class-names";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function AddToHomeScreenButton({ className }: { className?: string }) {
  const { dictionary } = useLocaleContext();
  const copy = dictionary.addToHomeScreen;
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsStandalone(isStandaloneDisplay());
    });

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => setIsStandalone(isStandaloneDisplay());
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setIsStandalone(true);

    mediaQuery.addEventListener("change", handleDisplayModeChange);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      setShowGuide(true);
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (isStandalone) return null;

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="destructive"
        className={cn(className, "text-primary cursor-pointer")}
        aria-label={copy.actionLabel}
        onClick={handleInstall}
      >
        <SquarePlus />
      </Button>

      <AppModal
        open={showGuide}
        onOpenChange={setShowGuide}
        title={copy.title}
        description={copy.description}
        footer={
          <Button type="button" onClick={() => setShowGuide(false)}>
            {copy.gotIt}
          </Button>
        }
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>
            {copy.steps.shareStart} <InlineIcon icon={<Share />} label={copy.steps.share} />
            {copy.steps.shareMiddle} <InlineIcon icon={<Share />} label={copy.steps.share} />
            {copy.steps.shareEnd}
          </li>
          <li>
            {copy.steps.expandStart} <InlineText label={copy.steps.viewMore} />
            {copy.steps.expandEnd}
          </li>
          <li>
            {copy.steps.addStart} <InlineIcon icon={<SquarePlus />} label={copy.steps.addToHomeScreen} />
            {copy.steps.addEnd}
          </li>
          <li>
            {copy.steps.confirmStart} <InlineText label={copy.steps.add} />
            {copy.steps.confirmEnd}
          </li>
        </ol>
      </AppModal>
    </>
  );
}

function InlineIcon({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex pr-0.5 items-baseline gap-1 align-baseline font-medium leading-[inherit] text-primary [&_svg]:relative [&_svg]:top-[0.125em] [&_svg]:size-[1em]">
      {icon}
      {label}
    </span>
  );
}

function InlineText({ label }: { label: string }) {
  return (
    <span className="inline-flex pr-0.5 items-baseline gap-1 align-baseline font-medium leading-[inherit] text-primary [&_svg]:relative [&_svg]:top-[0.125em] [&_svg]:size-[1em]">
      {label}
    </span>
  );
}
