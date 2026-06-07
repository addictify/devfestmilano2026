import { useTranslations } from "next-intl";
import { ArrowUpRight, Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { GdgColorBar } from "@/components/common/GdgColorBar";
import { DevFestMark } from "@/components/common/DevFestMark";
import { Container } from "@/components/common/Container";

const EXPLORE = [
  { href: "/speakers", key: "speakers" },
  { href: "/agenda", key: "agenda" },
  { href: "/sponsors", key: "sponsors" },
  { href: "/venue", key: "venue" },
  { href: "/cfp", key: "cfp" },
] as const;

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const year = new Date().getFullYear();

  const social = [
    { label: "Instagram", href: siteConfig.social.instagram },
    { label: "X / Twitter", href: siteConfig.social.x },
    { label: "YouTube", href: siteConfig.social.youtube },
  ];

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border bg-paper">
      <GdgColorBar className="absolute inset-x-0 top-0" />
      <Container className="relative pt-16 pb-10">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <DevFestMark className="h-6" />
              <span className="font-display text-xl font-extrabold tracking-tight">
                DevFest Milano
              </span>
            </Link>
            <p className="max-w-xs text-pretty text-muted-foreground">
              {t("tagline")}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <nav className="flex flex-col gap-3">
            <h3 className="eyebrow text-muted-foreground">{t("explore")}</h3>
            {EXPLORE.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="w-fit text-foreground/80 transition-colors hover:text-gdg-blue"
              >
                {nav(item.key)}
              </Link>
            ))}
          </nav>

          <nav className="flex flex-col gap-3">
            <h3 className="eyebrow text-muted-foreground">{t("community")}</h3>
            {siteConfig.communities.map((c) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-fit items-center gap-1 text-foreground/80 transition-colors hover:text-gdg-blue"
              >
                {c.name}
                <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-4">
            <h3 className="eyebrow text-muted-foreground">{t("newsletter")}</h3>
            <p className="text-sm text-muted-foreground">{t("newsletterBody")}</p>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/communities">
                {t("join")}
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <p className="mt-14 max-w-3xl text-xs leading-relaxed text-muted-foreground/80">
          {t("disclaimer")}
        </p>

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5">
            {t("madeWith")}{" "}
            <Heart className="size-3.5 fill-gdg-red text-gdg-red" /> {t("by")}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/code-of-conduct"
              className="transition-colors hover:text-foreground"
            >
              {t("codeOfConduct")}
            </Link>
            <span>
              © {year} GDG Cloud Milano · GDG Milano. {t("rights")}
            </span>
          </div>
        </div>
      </Container>

      <div
        aria-hidden
        className="pointer-events-none select-none px-5 sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <span className="block translate-y-[18%] font-display text-[19vw] font-extrabold leading-none tracking-tighter text-foreground/[0.04]">
            DEVFEST
          </span>
        </div>
      </div>
    </footer>
  );
}
