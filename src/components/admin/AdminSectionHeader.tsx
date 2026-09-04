import type { ReactNode } from "react";

/**
 * Title plus a line explaining what the section is for.
 *
 * The panel is used a few times a year, often by someone who didn't build it,
 * so a bare "Checkpoint" heading assumes knowledge nobody has by then. The
 * description is the place to say what the thing does *and* what it affects —
 * especially where that isn't reversible or obvious (a QR code that grants
 * points, a toggle that changes the public site).
 */
export function AdminSectionHeader({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="mb-6">
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </header>
  );
}
