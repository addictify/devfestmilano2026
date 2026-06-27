import { GDG, GDG_ORDER } from "@/lib/design/tokens";

export const metadata = { title: "Offline · DevFest Milano 2026" };

export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center p-8 text-center">
      <div>
        <div aria-hidden className="mx-auto mb-6 flex w-40 gap-1">
          {GDG_ORDER.map((g) => (
            <span key={g} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: GDG[g] }} />
          ))}
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Sei offline</h1>
        <p className="mt-2 text-muted-foreground">Riconnettiti per continuare.</p>
        <p className="mt-4 text-sm text-muted-foreground">You&apos;re offline — reconnect to continue.</p>
      </div>
    </main>
  );
}
