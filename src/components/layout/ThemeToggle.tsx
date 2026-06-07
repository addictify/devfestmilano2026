"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid theme hydration mismatch: only reveal the icon after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={t("theme")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-[1.15rem]" />
        ) : (
          <Moon className="size-[1.15rem]" />
        )
      ) : (
        <span className="size-[1.15rem]" />
      )}
    </button>
  );
}
