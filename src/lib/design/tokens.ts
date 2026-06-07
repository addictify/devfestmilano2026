// Design tokens — single source of truth for the GDG 4-color system.
// Mirrored as CSS custom properties in globals.css.

export const GDG = {
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC04",
  green: "#34A853",
} as const;

export type GdgColor = keyof typeof GDG;

export const GDG_ORDER: GdgColor[] = ["blue", "red", "yellow", "green"];

/** Deterministically map an arbitrary key (track id, index, name) to a brand color. */
export function colorForKey(key: string | number): GdgColor {
  const n =
    typeof key === "number"
      ? key
      : Array.from(key).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GDG_ORDER[Math.abs(n) % GDG_ORDER.length];
}

/** Tailwind utility class fragments per brand color, kept literal so they aren't purged. */
export const colorClasses: Record<
  GdgColor,
  { text: string; bg: string; bgSoft: string; border: string; ring: string; dot: string }
> = {
  blue: {
    text: "text-gdg-blue",
    bg: "bg-gdg-blue",
    bgSoft: "bg-gdg-blue/10",
    border: "border-gdg-blue",
    ring: "ring-gdg-blue",
    dot: "bg-gdg-blue",
  },
  red: {
    text: "text-gdg-red",
    bg: "bg-gdg-red",
    bgSoft: "bg-gdg-red/10",
    border: "border-gdg-red",
    ring: "ring-gdg-red",
    dot: "bg-gdg-red",
  },
  yellow: {
    text: "text-gdg-yellow",
    bg: "bg-gdg-yellow",
    bgSoft: "bg-gdg-yellow/15",
    border: "border-gdg-yellow",
    ring: "ring-gdg-yellow",
    dot: "bg-gdg-yellow",
  },
  green: {
    text: "text-gdg-green",
    bg: "bg-gdg-green",
    bgSoft: "bg-gdg-green/10",
    border: "border-gdg-green",
    ring: "ring-gdg-green",
    dot: "bg-gdg-green",
  },
};
