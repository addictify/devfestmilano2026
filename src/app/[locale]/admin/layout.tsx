import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { AdminGate } from "@/components/admin/AdminGate";

export const metadata: Metadata = { robots: { index: false }, title: "Admin · DevFest Milano 2026" };

const SECTIONS = [
  { href: "/admin/dashboard", label: "Cruscotto" },
  { href: "/admin/checkpoints", label: "Checkpoint" },
  { href: "/admin/badges", label: "Badge" },
  { href: "/admin/sponsors", label: "Sponsor" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/subscribers", label: "Iscritti" },
  { href: "/admin/config", label: "Configurazione" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="rounded-full px-3.5 py-1.5 text-sm font-medium hover:bg-muted">
              {s.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </AdminGate>
  );
}
