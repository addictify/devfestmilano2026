"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

/** `aClosed`, when present, replaces `a` while the CFP is closed — so the
 *  phase-dependent answers flip with the flag instead of being rewritten. */
type FaqItem = { q: string; a: string; aClosed?: string };

export function FaqList() {
  const t = useTranslations("faq");
  const { cfpOpen } = useSiteSettings();
  const items = t.raw("items") as FaqItem[];

  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`faq-${i}`}>
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>
            {!cfpOpen && item.aClosed ? item.aClosed : item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
