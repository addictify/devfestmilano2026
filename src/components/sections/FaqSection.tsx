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
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          color="green"
        />
        <MotionReveal className="mt-10">
          <FaqList />
        </MotionReveal>
      </Container>
    </section>
  );
}
