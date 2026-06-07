import type { GdgColor } from "@/lib/design/tokens";
import type { LocalizedString } from "@/types/models";

export interface Community {
  id: string;
  name: string;
  url: string;
  meetup: string;
  color: GdgColor;
  focus: LocalizedString;
  description: LocalizedString;
}

// DevFest Milano is co-organized by two distinct GDG communities.
export const communities: Community[] = [
  {
    id: "gdg-cloud-milano",
    name: "GDG Cloud Milano",
    url: "https://gdg.community.dev/gdg-cloud-milano/",
    meetup: "https://www.meetup.com/gdg-cloud-milano/",
    color: "green",
    focus: {
      it: "Cloud · AI · DevOps · Infrastruttura",
      en: "Cloud · AI · DevOps · Infrastructure",
    },
    description: {
      it: "Il Google Developer Group Cloud di Milano è la community dedicata a Google Cloud, AI, Kubernetes, DevOps e tecnologie cloud-native. Organizza talk, sessioni hands-on e momenti di networking per chi progetta, costruisce e gestisce sistemi sul cloud e soluzioni di intelligenza artificiale.",
      en: "Google Developer Group Cloud Milano is the community focused on Google Cloud, AI, Kubernetes, DevOps and cloud-native technologies. It runs talks, hands-on sessions and networking for everyone who designs, builds and operates systems on the cloud and AI solutions.",
    },
  },
  {
    id: "gdg-milano",
    name: "GDG Milano",
    url: "https://gdg.community.dev/gdg-milano/",
    meetup: "https://www.meetup.com/gdg-milano/",
    color: "blue",
    focus: {
      it: "Android · Web · AI · e molto altro",
      en: "Android · Web · AI · and much more",
    },
    description: {
      it: "Il Google Developer Group di Milano riunisce sviluppatori, designer e appassionati di tecnologia attorno all'intero ecosistema Google: Android, Web, AI, Flutter, Firebase e oltre. Eventi, meetup e workshop aperti a tutta la community, dal principiante all'esperto.",
      en: "Google Developer Group Milano brings together developers, designers and tech enthusiasts around the whole Google ecosystem: Android, Web, AI, Flutter, Firebase and beyond. Events, meetups and workshops open to everyone, from beginners to experts.",
    },
  },
];
