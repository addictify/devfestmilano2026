"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/common/Container";
import { GdgDots } from "@/components/common/GdgColorBar";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20 text-center">
      <GdgDots className="scale-150" />
      <p className="font-display text-[clamp(5rem,18vw,12rem)] font-extrabold leading-none tracking-tighter">
        404
      </p>
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {t("notFoundTitle")}
      </h1>
      <p className="max-w-sm text-muted-foreground">{t("notFoundBody")}</p>
      <Button asChild variant="accent" size="lg">
        <Link href="/">
          <ArrowLeft className="size-5" />
          {t("backHome")}
        </Link>
      </Button>
    </Container>
  );
}
