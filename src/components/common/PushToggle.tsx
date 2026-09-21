"use client";

import { useTranslations } from "next-intl";
import { Bell, BellOff, BellRing } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * Turn event notifications on for this device.
 *
 * Renders nothing where push can't work — no Push API, or no VAPID key in the
 * build — rather than offering a switch that does nothing. A browser-level
 * refusal is shown as text, not a disabled button: only the browser's own
 * settings can undo it, and a greyed-out toggle would suggest otherwise.
 */
export function PushToggle({ className }: { className?: string }) {
  const { state, busy, enable, disable } = usePushNotifications();
  const { user } = useAuth();
  const t = useTranslations("push");

  if (state === "unsupported" || state === "loading") return null;

  if (state === "denied") {
    return (
      <p
        className={cn(
          "inline-flex items-center gap-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <BellOff className="size-4 shrink-0" />
        {t("blocked")}
      </p>
    );
  }

  const on = state === "on";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <button
        onClick={() => void (on ? disable() : enable())}
        disabled={busy}
        aria-pressed={on}
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60",
          on
            ? "border-transparent bg-gdg-green-solid text-white"
            : "border-border hover:bg-muted",
        )}
      >
        {on ? <BellRing className="size-4" /> : <Bell className="size-4" />}
        {on ? t("on") : t("enable")}
      </button>
      <p className="max-w-prose text-xs text-muted-foreground">
        {/* Reminders follow favourites, which belong to an account. Say so
            here rather than letting someone wonder why they never arrive. */}
        {on && !user ? t("signInForReminders") : t("what")}
      </p>
    </div>
  );
}
