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
    id: "devfest-2025",
    label: "2025",
    title: { it: "DevFest Milano 2025", en: "DevFest Milano 2025" },
    description: {
      it: "L'edizione più recente: due community, track in parallelo e una giornata intensa di talk e workshop nel cuore di Milano.",
      en: "Our most recent edition: two communities, parallel tracks and a packed day of talks and workshops in the heart of Milan.",
    },
    color: "red",
  },
  {
    id: "devfest-2024",
    label: "2024",
    title: { it: "DevFest Milano 2024", en: "DevFest Milano 2024" },
    description: {
      it: "Una giornata di talk e workshop su AI, Cloud, Mobile e Web con centinaia di developer da tutta Italia.",
      en: "A full day of talks and workshops on AI, Cloud, Mobile and Web with hundreds of developers from across Italy.",
    },
    color: "yellow",
  },
  {
    id: "devfest-2023",
    label: "2023",
    title: { it: "DevFest Milano 2023", en: "DevFest Milano 2023" },
    description: {
      it: "Speaker da tutta Italia, track in parallelo e tanta community in una location nel cuore di Milano.",
      en: "Speakers from across Italy, parallel tracks and lots of community in a venue in the heart of Milan.",
    },
    color: "green",
  },
  {
    id: "io-extended",
    label: "I/O Extended",
    title: { it: "Google I/O Extended", en: "Google I/O Extended" },
    description: {
      it: "Ogni anno seguiamo insieme il Google I/O con watch party e sessioni sulle novità annunciate da Google.",
      en: "Every year we watch Google I/O together with watch parties and sessions on what Google just announced.",
    },
    color: "blue",
  },
  {
    id: "cloud-ai-meetups",
    label: "Cloud · AI",
    title: { it: "Meetup Cloud & AI", en: "Cloud & AI meetups" },
    description: {
      it: "GDG Cloud Milano organizza incontri su Google Cloud, AI e DevOps durante tutto l'anno.",
      en: "GDG Cloud Milano runs meetups on Google Cloud, AI and DevOps throughout the year.",
    },
    color: "red",
  },
  {
    id: "android-web-meetups",
    label: "Android · Web",
    title: { it: "Meetup Android & Web", en: "Android & Web meetups" },
    description: {
      it: "GDG Milano porta avanti una community attiva su Android, Web, Flutter e oltre.",
      en: "GDG Milano keeps an active community on Android, Web, Flutter and beyond.",
    },
    color: "yellow",
  },
];
