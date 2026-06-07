import type { GdgColor } from "@/lib/design/tokens";
import type { LocalizedString } from "@/types/models";

export interface PastEvent {
  id: string;
  label: string; // year / period badge
  title: LocalizedString;
  description: LocalizedString;
  color: GdgColor;
}

// A taste of what the two communities have run before. Update with real
// highlights / numbers when available.
export const pastEvents: PastEvent[] = [
  {
    id: "devfest-2024",
    label: "2024",
    title: { it: "DevFest Milano 2024", en: "DevFest Milano 2024" },
    description: {
      it: "Una giornata di talk e workshop su AI, Cloud, Mobile e Web con centinaia di developer da tutta Italia.",
      en: "A full day of talks and workshops on AI, Cloud, Mobile and Web with hundreds of developers from across Italy.",
    },
    color: "red",
  },
  {
    id: "devfest-2023",
    label: "2023",
    title: { it: "DevFest Milano 2023", en: "DevFest Milano 2023" },
    description: {
      it: "Speaker da tutta Italia, track in parallelo e tanta community in una location nel cuore di Milano.",
      en: "Speakers from across Italy, parallel tracks and lots of community in a venue in the heart of Milan.",
    },
    color: "yellow",
  },
  {
    id: "cloud-ai-meetups",
    label: "Cloud · AI",
    title: { it: "Meetup Cloud & AI", en: "Cloud & AI meetups" },
    description: {
      it: "GDG Cloud Milano organizza incontri su Google Cloud, AI e DevOps durante tutto l'anno.",
      en: "GDG Cloud Milano runs meetups on Google Cloud, AI and DevOps throughout the year.",
    },
    color: "green",
  },
  {
    id: "android-web-meetups",
    label: "Android · Web",
    title: { it: "Meetup Android & Web", en: "Android & Web meetups" },
    description: {
      it: "GDG Milano porta avanti una community attiva su Android, Web, Flutter e oltre.",
      en: "GDG Milano keeps an active community on Android, Web, Flutter and beyond.",
    },
    color: "blue",
  },
];
