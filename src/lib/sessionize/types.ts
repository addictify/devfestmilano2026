// Subset of the Sessionize public API `/view/All` response.
// https://sessionize.com/api/v2/{eventId}/view/All

export interface SzLink {
  title: string;
  url: string;
  linkType: string; // "Twitter" | "LinkedIn" | "Blog" | "Company_Website" | ...
}

export interface SzSpeaker {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  bio: string | null;
  tagLine: string | null;
  profilePicture: string | null;
  isTopSpeaker: boolean;
  links: SzLink[];
  sessions: (number | string)[];
  questionAnswers: { questionId: number; question: string; answer: string }[];
  categories: { id: number; name: string; categoryItems: { id: number; name: string }[] }[];
}

export interface SzSession {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isServiceSession: boolean;
  isPlenumSession: boolean;
  speakers: string[];
  categoryItems: number[];
  roomId: number | null;
  room: string | null;
  status: string;
  liveUrl: string | null;
  recordingUrl: string | null;
}

export interface SzRoom {
  id: number;
  name: string;
  sort: number;
}

export interface SzCategoryItem {
  id: number;
  name: string;
  sort: number;
}

export interface SzCategory {
  id: number;
  title: string; // e.g. "Level", "Language", "Tags"
  items: SzCategoryItem[];
  sort: number;
  type: string;
}

export interface SzAll {
  sessions: SzSession[];
  speakers: SzSpeaker[];
  rooms: SzRoom[];
  categories: SzCategory[];
  questions: unknown[];
}
