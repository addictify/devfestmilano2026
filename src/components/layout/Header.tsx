"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { TicketButton } from "@/components/common/TicketButton";
import { DevFestMark } from "@/components/common/DevFestMark";
import { GdgColorBar } from "@/components/common/GdgColorBar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/speakers", key: "speakers" },
  { href: "/agenda", key: "agenda" },
  { href: "/communities", key: "communities" },
  { href: "/sponsors", key: "sponsors" },
  { href: "/venue", key: "venue" },
  { href: "/faq", key: "faq" },
] as const;

function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="group flex items-center gap-2.5"
      aria-label="DevFest Milano 2026 — home"
    >
      <DevFestMark className="h-5 transition-transform duration-300 group-hover:scale-105" />
      <span className="font-display text-lg font-extrabold tracking-tight">
        DevFest<span className="text-muted-foreground"> Milano</span>
      </span>
    </Link>
  );
}

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          "transition-all duration-300",
          scrolled
            ? "border-b border-border bg-background/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Wordmark />

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <ThemeToggle className="hidden sm:inline-flex" />
            <TicketButton size="sm" className="hidden md:inline-flex" />

            {/* Mobile menu */}
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger
                aria-label={t("menu")}
                className="inline-flex size-10 items-center justify-center rounded-full border border-border lg:hidden"
              >
                <Menu className="size-5" />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm data-[state=open]:animate-[acc-down_0.2s_ease]" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(86vw,22rem)] flex-col bg-background shadow-2xl data-[state=open]:animate-[slide-in_0.3s_var(--ease-out-expo)]">
                  <GdgColorBar />
                  <div className="flex items-center justify-between px-6 py-4">
                    <Wordmark onClick={() => setOpen(false)} />
                    <Dialog.Close
                      aria-label={t("close")}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-border"
                    >
                      <X className="size-5" />
                    </Dialog.Close>
                  </div>
                  <Dialog.Title className="sr-only">{t("menu")}</Dialog.Title>
                  <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
                    {NAV.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="rounded-2xl px-4 py-3.5 font-display text-2xl font-semibold tracking-tight transition-colors hover:bg-muted"
                      >
                        {t(item.key)}
                      </Link>
                    ))}
                  </nav>
                  <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
                    <div className="flex items-center gap-2">
                      <LanguageSwitcher />
                      <ThemeToggle />
                    </div>
                    <TicketButton size="sm" />
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </div>
    </header>
  );
}
