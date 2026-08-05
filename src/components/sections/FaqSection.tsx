import { useTranslations } from "next-intl";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { MotionReveal } from "@/components/common/MotionReveal";
import { FaqList } from "./FaqList";

export function FaqSection() {
  const t = useTranslations("faq");

  return (
    <section className="py-20 sm:py-28" id="faq">
      <Container className="max-w-3xl">
        <SectionHeading
          title={t("title")}
          lead={t.rich("lead", {
            contact: (chunks) => (
              <a
                href="mailto:infogdgmi+devfest@gmail.com"
                className="underline decoration-1 underline-offset-2 hover:text-foreground"
              >
                {chunks}
              </a>
            ),
          })}
          color="green"
        />
        <MotionReveal className="mt-10">
          <FaqList />
        </MotionReveal>
      </Container>
    </section>
  );
}
