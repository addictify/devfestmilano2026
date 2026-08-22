import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminGate } from "@/components/admin/AdminGate";
import { PublishBar } from "@/components/admin/PublishBar";

export const metadata: Metadata = { robots: { index: false }, title: "Admin · DevFest Milano 2026" };

const SECTIONS = [
  { href: "/admin/dashboard", label: "Cruscotto" },
  { href: "/admin/checkpoints", label: "Checkpoint" },
  { href: "/admin/badges", label: "Badge" },
  { href: "/admin/sponsors", label: "Sponsor" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/subscribers", label: "Iscritti" },
  { href: "/admin/config", label: "Configurazione" },
  { href: "/admin/admins", label: "Amministratori" },
];

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Without this next-intl falls back to headers(), which forces dynamic
  // rendering and breaks the static export.
  const { locale } = await params;
  setRequestLocale(locale);
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
        <PublishBar />
        {children}
      </div>
    </AdminGate>
  );
}
