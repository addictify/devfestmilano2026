import { useTranslations } from "next-intl";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SpeakerTypesContent } from "./SpeakerTypesContent";

/** Home section shown while the Call for Speakers is open (no confirmed lineup). */
export function SpeakerTypesSection() {
  const t = useTranslations("speakerTypes");

  return (
    <section className="bg-paper py-20 sm:py-28" id="speakers">
      <Container>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          color="red"
        />
        <div className="mt-12">
          <SpeakerTypesContent />
        </div>
      </Container>
    </section>
  );
}
