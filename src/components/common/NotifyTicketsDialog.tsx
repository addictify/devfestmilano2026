"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations, useLocale } from "next-intl";
import { ArrowUpRight, Bell, X } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { colorClasses, GDG, GDG_ORDER } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Ticket-intent capture shown while tickets are not on sale. Instead of a dead
 * "soon" button, it opens a dialog that routes people to follow BOTH organizing
 * communities (where ticket announcements are published).
 */
export function NotifyTicketsDialog({
  size = "lg",
  variant = "outline",
  className,
}: {
  size?: ButtonProps["size"];
  /** Promoted to `accent` when this is the hero's leading action. */
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const t = useTranslations("notify");
  const tHero = useTranslations("hero");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, locale, website }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Bell className="size-4" />
          {tHero("ctaNotify")}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm data-[state=open]:motion-safe:animate-[acc-down_0.2s_ease]" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)]",
            "data-[state=open]:motion-safe:animate-[acc-down_0.25s_var(--ease-out-expo)]",
          )}
        >
          {/* Four-color beam */}
          <div
            aria-hidden
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${GDG.blue} 0 25%, ${GDG.red} 25% 50%, ${GDG.yellow} 50% 75%, ${GDG.green} 75% 100%)`,
            }}
          />

          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="font-display text-2xl font-bold tracking-tight">
                {t("title")}
              </Dialog.Title>
              <Dialog.Close
                aria-label={t("close")}
                className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <Dialog.Description className="mt-3 text-pretty text-muted-foreground">
              {t("body")}
            </Dialog.Description>

            {status === "ok" ? (
              <p className="mt-5 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm font-medium" aria-live="polite">
                {t("success")}
              </p>
            ) : (
              <form onSubmit={submit} className="mt-5 flex flex-col gap-2">
                <label htmlFor="notify-email" className="sr-only">{t("emailLabel")}</label>
                {/* honeypot */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} />
                <div className="flex gap-2">
                  <input
                    id="notify-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                  <Button type="submit" size="md" disabled={status === "loading"}>{t("submit")}</Button>
                </div>
                {status === "error" && (
                  <p className="text-sm text-gdg-red" aria-live="polite">{t("error")}</p>
                )}
                <p className="text-xs text-muted-foreground">{t("privacy")}</p>
              </form>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              {siteConfig.communities.map((c) => {
                const cc = colorClasses[c.color];
                return (
                  <a
                    key={c.id}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3.5 transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <span className={cn("size-2.5 rounded-full", cc.bg)} />
                      {t("follow", { community: c.name })}
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                );
              })}
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <span aria-hidden className="inline-flex gap-1">
                {GDG_ORDER.map((g) => (
                  <span
                    key={g}
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: GDG[g] }}
                  />
                ))}
              </span>
              {t("note")}
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
