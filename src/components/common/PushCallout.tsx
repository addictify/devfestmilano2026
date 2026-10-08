"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BellRing, Share } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { PushToggleControl } from "@/components/common/PushToggle";
import { cn } from "@/lib/utils";

/**
 * The notifications invitation, where people actually are (home, agenda,
 * notifications) rather than only on My Schedule.
 *
 * It is in the server HTML for everyone, and the pre-paint script
 * (lib/push/prepaint) hides it — or swaps the toggle for the iOS Home Screen
 * hint — through CSS before anything is drawn. Waiting for the async
 * subscription check instead made it appear late and shove the page down.
 * After hydration it only steps aside once the check proves it's moot
 * (already subscribed, or refused), and stays up after the click that turned
 * notifications on so "on" reads as a confirmation.
 */
export function PushCallout({
  className,
  mini = false,
}: {
  className?: string;
  /** One line under the hero CTAs instead of a card. */
  mini?: boolean;
}) {
  const push = usePushNotifications();
  const t = useTranslations("push");
  const { user } = useAuth();
  const [touched, setTouched] = useState(false);

  if ((push.state === "on" && !touched) || push.state === "denied") return null;

  const shareIcon = () => (
    <Share className="inline size-4 -translate-y-px" aria-label={t("iosShare")} />
  );

  if (mini) {
    return (
      <div className={cn("push-prompt text-sm", className)}>
        {/* Filled and tinted so it reads as an action against the hero's
            pale background, where an outline pill disappeared. */}
        <div className="push-prompt-toggle inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl bg-gdg-blue/10 p-1.5 pr-4 ring-1 ring-gdg-blue/25">
          <span onClickCapture={() => setTouched(true)}>
            <PushToggleControl push={push} bare tone="accent" />
          </span>
          <span className="text-foreground/80">{t("miniWhat")}</span>
        </div>
        <p className="push-prompt-ios max-w-xl text-pretty text-muted-foreground">
          <BellRing className="mr-1.5 inline size-4 -translate-y-px text-gdg-blue" />
          {t.rich("iosHintShort", { share: shareIcon })}
        </p>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "push-prompt flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6",
        className,
      )}
    >
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gdg-blue/10 text-gdg-blue">
        <BellRing className="size-5" />
      </span>
      <div className="flex-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">{t("calloutTitle")}</h2>
        <p className="push-prompt-toggle mt-1 max-w-prose text-pretty text-sm text-muted-foreground">
          {push.state === "on" && !user ? t("signInForReminders") : t("what")}
        </p>
        <p className="push-prompt-ios mt-1 max-w-prose text-pretty text-sm text-muted-foreground">
          {t.rich("iosHint", { share: shareIcon })}
        </p>
      </div>
      <div onClickCapture={() => setTouched(true)} className="push-prompt-toggle shrink-0">
        <PushToggleControl push={push} bare />
      </div>
    </aside>
  );
}
