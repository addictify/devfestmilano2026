"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { Check, Globe } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = { it: "Italiano", en: "English" };

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === locale) return;
    startTransition(() => {
      // `pathname` from i18n navigation is locale-agnostic; router prepends the locale.
      router.replace(
        // @ts-expect-error -- pathname + params are compatible at runtime
        { pathname, params },
        { locale: next },
      );
    });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 font-mono text-xs uppercase tracking-wider text-foreground transition-colors hover:bg-muted disabled:opacity-60",
          className,
        )}
        disabled={isPending}
      >
        <Globe className="size-4" />
        {locale}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-40 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl data-[state=open]:animate-[acc-down_0.15s_ease]"
        >
          {routing.locales.map((l) => (
            <DropdownMenu.Item
              key={l}
              onSelect={() => switchTo(l)}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
            >
              <span>{LABELS[l] ?? l}</span>
              {l === locale && <Check className="size-4 text-gdg-green" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
