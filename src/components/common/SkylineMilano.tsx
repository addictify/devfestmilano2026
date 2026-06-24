import { cn } from "@/lib/utils";

/**
 * Milano skyline — Arco della Pace, towers, Duomo, Castello Sforzesco.
 *
 * The source artwork is a single white-stroke transparent PNG. Rendered as a
 * CSS mask (the PNG alpha channel is the shape, the fill is `bg-foreground`)
 * so it adapts to both light and dark themes instead of disappearing on the
 * light `paper` background. Decorative only.
 *
 * Asset: public/images/brand/milano_skyline.png (alpha synthesized from the
 * source line-art's luminance, cropped to content — intrinsic 2598×669).
 */
export function SkylineMilano({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "aspect-[2598/669] w-full bg-foreground",
        "[mask-image:url('/images/brand/milano_skyline.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]",
        "[-webkit-mask-image:url('/images/brand/milano_skyline.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]",
        className,
      )}
    />
  );
}
