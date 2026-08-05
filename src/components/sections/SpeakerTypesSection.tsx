import { useTranslations } from "next-intl";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SpeakerTypesContent } from "./SpeakerTypesContent";

/** Home section shown until the lineup is published (CFP open, or proposals
 *  closed and under review). */
export function SpeakerTypesSection({ cfpOpen }: { cfpOpen: boolean }) {
  const t = useTranslations("speakerTypes");

  return (
    <section className="bg-paper py-20 sm:py-28" id="speakers">
      <Container>
        <SectionHeading
          eyebrow={cfpOpen ? t("eyebrow") : t("eyebrowClosed")}
          title={t("title")}
          lead={t("lead")}
          color="red"
        />
        <div className="mt-12">
          <SpeakerTypesContent cfpOpen={cfpOpen} />
        </div>
      </Container>
    </section>
  );
}
