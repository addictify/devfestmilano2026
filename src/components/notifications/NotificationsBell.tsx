"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatTime } from "@/lib/time";
import { localizeAnnouncement } from "@/lib/push/announcements";
import { markAnnouncementsSeen, refreshAnnouncements, useAnnouncements } from "@/hooks/useAnnouncements";

const SHOWN = 4;

/**
 * Header bell: the latest announcements at a glance, a dot when there's
 * something this browser hasn't seen. For everyone, signed in or not —
 * announcements are for the whole room, like the push itself.
 */
export function NotificationsBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const { status, items, unread } = useAnnouncements();

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        if (!open) return;
        markAnnouncementsSeen();
        void refreshAnnouncements(15_000);
      }}
    >
      <DropdownMenu.Trigger
        aria-label={unread ? t("bellUnread") : t("title")}
        data-notifications-bell
        className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
      >
        <Bell className="size-4" />
        {unread && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-gdg-red ring-2 ring-card"
          />
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl data-[state=open]:animate-[acc-down_0.15s_ease]"
        >
          <p className="px-3 pb-1 pt-2 eyebrow text-muted-foreground">{t("title")}</p>

          {status === "ready" && items.length > 0 ? (
            items.slice(0, SHOWN).map((a) => {
              const { title, body } = localizeAnnouncement(a, locale);
              return (
                <DropdownMenu.Item key={a.id} asChild>
                  <Link
                    href={{ pathname: "/notifications", query: { id: a.id } }}
                    className="block min-w-0 cursor-pointer rounded-xl px-3 py-2.5 outline-none transition-colors data-[highlighted]:bg-muted"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="line-clamp-1 text-sm font-semibold wrap-anywhere">{title}</span>
                      {a.sentAt && (
                        <time dateTime={a.sentAt} className="shrink-0 font-mono text-xs text-muted-foreground">
                          {formatTime(a.sentAt, locale)}
                        </time>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground wrap-anywhere">{body}</span>
                  </Link>
                </DropdownMenu.Item>
              );
            })
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {status === "error" ? t("error") : status === "ready" ? t("empty") : t("loading")}
            </p>
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/notifications"
              className="flex cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-gdg-blue outline-none transition-colors data-[highlighted]:bg-muted"
            >
              {t("seeAll")}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
