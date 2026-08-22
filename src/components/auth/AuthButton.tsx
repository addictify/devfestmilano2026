"use client";

import Image from "next/image";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { LogOut, CalendarHeart, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function initials(name: string | null, email: string | null): string {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function AuthButton() {
  const { user, loading, enabled, signIn, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const t = useTranslations("auth");

  if (!enabled) return null;
  if (loading) {
    return <span aria-hidden className="inline-block size-9 rounded-full bg-muted" />;
  }
  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => void signIn()}>
        {t("signIn")}
      </Button>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t("account")}
        className={cn(
          "inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold transition-colors hover:bg-muted",
        )}
      >
        {user.photoURL ? (
          <Image src={user.photoURL} alt={user.displayName ?? "account"} width={36} height={36} className="size-9 object-cover" />
        ) : (
          <span>{initials(user.displayName, user.email)}</span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl data-[state=open]:animate-[acc-down_0.15s_ease]"
        >
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("signedInAs")}</p>
            <p className="truncate text-sm font-medium">{user.displayName ?? user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/my-schedule"
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
            >
              <CalendarHeart className="size-4 text-muted-foreground" />
              {t("myschedule")}
            </Link>
          </DropdownMenu.Item>
          {/* Organizers only — /admin is otherwise reachable by URL alone, which
              is easy to forget. Hiding it isn't the access control: AdminGate
              and every /api/admin/* route check the claim server-side. */}
          {isAdmin === true && (
            <DropdownMenu.Item asChild>
              <Link
                href="/admin"
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
              >
                <ShieldCheck className="size-4 text-muted-foreground" />
                {t("admin")}
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onSelect={() => void signOut()}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
          >
            <LogOut className="size-4 text-muted-foreground" />
            {t("signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
