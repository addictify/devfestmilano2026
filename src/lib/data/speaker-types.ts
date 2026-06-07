import type { GdgColor } from "@/lib/design/tokens";
import type { LocalizedString } from "@/types/models";

export type SpeakerTypeIcon =
  | "googler"
  | "gde"
  | "professional"
  | "international";

export interface SpeakerType {
  id: string;
  icon: SpeakerTypeIcon;
  title: LocalizedString;
  description: LocalizedString;
  color: GdgColor;
}

// What kind of speakers to expect while the Call for Speakers is open.
export const speakerTypes: SpeakerType[] = [
  {
    id: "googlers",
    icon: "googler",
    color: "blue",
    title: { it: "Googler", en: "Googlers" },
    description: {
      it: "Engineer e advocate direttamente da Google, per raccontare le tecnologie da chi le costruisce.",
      en: "Engineers and advocates straight from Google, sharing the technologies from the people who build them.",
    },
  },
  {
    id: "gde",
    icon: "gde",
    color: "red",
    title: {
      it: "Google Developer Experts",
      en: "Google Developer Experts",
    },
    description: {
      it: "I GDE: esperti riconosciuti da Google su AI, Android, Web, Cloud, Flutter e altro.",
      en: "GDEs: experts recognized by Google across AI, Android, Web, Cloud, Flutter and more.",
    },
  },
  {
    id: "professionals",
    icon: "professional",
    color: "green",
    title: {
      it: "Professionisti del settore",
      en: "Industry professionals",
    },
    description: {
      it: "Sviluppatori, tech lead e founder che portano sul palco esperienze reali dalle aziende.",
      en: "Developers, tech leads and founders bringing real-world experience from the field.",
    },
  },
  {
    id: "international",
    icon: "international",
    color: "yellow",
    title: { it: "Voci internazionali", en: "International voices" },
    description: {
      it: "Speaker da tutta Italia, dall'Europa e dal mondo: prospettive diverse, una sola community.",
      en: "Speakers from across Italy, Europe and the world: diverse perspectives, one community.",
    },
  },
];
