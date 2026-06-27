"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { CalendarPlus, Download, ArrowUpRight } from "lucide-react";
import { googleCalendarUrl, icsDataUri, type CalendarEvent } from "@/lib/calendar";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddToCalendar({
  event,
  size = "md",
  variant = "outline",
  filename = "devfest-milano-2026.ics",
  className,
}: {
  event: CalendarEvent;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  filename?: string;
  className?: string;
}) {
  const t = useTranslations("calendar");
  if (!event.start || !event.end) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={cn(buttonVariants({ variant, size }), className)}>
        <CalendarPlus className="size-4" />
        {t("add")}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[12rem] overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)] data-[state=open]:motion-safe:animate-[acc-down_0.18s_ease]"
        >
          <DropdownMenu.Item asChild>
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
            >
              {t("google")}
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a
              href={icsDataUri(event)}
              download={filename}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
            >
              {t("ics")}
              <Download className="size-4 text-muted-foreground" />
            </a>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
