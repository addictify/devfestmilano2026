"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BellRing, Share } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { PushToggleControl } from "@/components/common/PushToggle";
import { cn } from "@/lib/utils";

/** iPhone/iPad Safari only exposes Web Push to a site added to the Home
 *  Screen. iPadOS reports itself as a Mac, hence the touch-points check. */
function isIosBrowserTab(): boolean {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/**
 * The notifications invitation, where people actually are (home, agenda)
 * rather than only on My Schedule. It asks once and then gets out of the way:
 * hidden while loading, once already subscribed, and when the browser has
 * refused (only its own settings can undo that). On iOS Safari, where the
 * toggle can't work, it explains the Home Screen step instead.
 */
export function PushCallout({ className }: { className?: string }) {
  const push = usePushNotifications();
  const t = useTranslations("push");
  const { user } = useAuth();
  // Keep the card up after the click that turned notifications on, so the
  // "on" state is seen as a confirmation instead of the card vanishing.
  const [touched, setTouched] = useState(false);

  const iosHint = push.state === "unsupported" && isIosBrowserTab();
  const show = push.state === "off" || (push.state === "on" && touched) || iosHint;
  if (!show) return null;

  return (
    <aside
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6",
        className,
      )}
    >
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gdg-blue/10 text-gdg-blue">
        <BellRing className="size-5" />
      </span>
      <div className="flex-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">{t("calloutTitle")}</h2>
        <p className="mt-1 max-w-prose text-pretty text-sm text-muted-foreground">
          {iosHint
            ? t.rich("iosHint", {
                share: () => <Share className="inline size-4 -translate-y-px" aria-label={t("iosShare")} />,
              })
            : push.state === "on" && !user
              ? t("signInForReminders")
              : t("what")}
        </p>
      </div>
      {!iosHint && (
        <div onClickCapture={() => setTouched(true)} className="shrink-0">
          <PushToggleControl push={push} bare />
        </div>
      )}
    </aside>
  );
}
