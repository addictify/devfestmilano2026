import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, Loader, Mic } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import { GDG, GDG_ORDER } from "@/lib/design/tokens";
import { formatLongDate } from "@/lib/time";
import { Container } from "@/components/common/Container";
import { MotionReveal } from "@/components/common/MotionReveal";
import { Button } from "@/components/ui/button";

/** `cfpOpen` comes from the caller (server pages read `getSiteSettings()`), so
 *  the Firestore flag can close the CFP without a redeploy. */
export function CfpSection({ cfpOpen }: { cfpOpen: boolean }) {
  const t = useTranslations("cfp");
  const locale = useLocale();
  const topics = t("topicsList")
    .split(",")
    .map((s) => s.trim());

  return (
    <section className="py-20 sm:py-28" id="cfp">
      <Container>
        <MotionReveal className="relative overflow-hidden rounded-[2rem] bg-accent px-7 py-14 text-accent-foreground sm:px-14 sm:py-20">
          {/* top beam */}
          <div aria-hidden className="absolute inset-x-0 top-0 flex h-1.5">
            {GDG_ORDER.map((c) => (
              <span
                key={c}
                className="flex-1"
                style={{ backgroundColor: GDG[c] }}
              />
            ))}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-10 size-72 rounded-full opacity-20 blur-3xl"
            style={{ background: GDG.blue }}
          />

          <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] opacity-70">
                <Mic className="size-4" />
                {t("eyebrow")}
              </span>
              <h2 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {cfpOpen ? t("title") : t("closedTitle")}
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-lg opacity-80">
                {cfpOpen ? t("lead") : t("closedLead")}
              </p>

              {cfpOpen ? (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button asChild variant="accent" size="lg">
                    <a
                      href={siteConfig.cfpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("cta")}
                      <ArrowUpRight className="size-5" />
                    </a>
                  </Button>
                  <p className="font-mono text-sm opacity-70">
                    {t("deadline")}{" "}
                    <span className="text-gdg-yellow">
                      {formatLongDate(siteConfig.cfpDeadline, locale)}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mt-8 flex flex-col gap-4">
                  <span
                    className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.15em] text-gdg-yellow"
                    style={{ borderColor: `${GDG.yellow}66` }}
                  >
                    <Loader
                      aria-hidden
                      className="size-3.5 motion-safe:animate-[spin_3s_linear_infinite]"
                    />
                    {t("closedBadge")}
                  </span>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button asChild variant="accent" size="lg">
                      <Link href="/agenda">
                        {t("closedCta")}
                        <ArrowRight className="size-5" />
                      </Link>
                    </Button>
                    <p className="font-mono text-sm opacity-70">
                      {t("closedDeadline")}{" "}
                      <span className="text-gdg-yellow">
                        {formatLongDate(siteConfig.cfpDeadline, locale)}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">
                {cfpOpen ? t("topics") : t("closedTopics")}
              </span>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic, i) => (
                  <span
                    key={topic}
                    className="rounded-full border px-3 py-1.5 text-sm"
                    style={{
                      borderColor: `${GDG[GDG_ORDER[i % 4]]}66`,
                      color: GDG[GDG_ORDER[i % 4]],
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </MotionReveal>
      </Container>
    </section>
  );
}
