"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";

type Row = { email: string; createdAt: string; locale: string; source: string };

export function SubscribersAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/subscribers")
      .then(async (r) => (r.ok ? ((await r.json()).rows as Row[]) : Promise.reject(r.status)))
      .then(setRows)
      .catch((s) => setError(`Errore (${s}).`));
  }, []);

  async function exportCsv() {
    const res = await adminFetch("/api/admin/subscribers/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold tracking-tight">Iscritti</h2>
        <Button onClick={exportCsv} disabled={!rows?.length}>Esporta CSV</Button>
      </div>
      <p className="mb-6 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
        Gli indirizzi raccolti dal modulo &laquo;avvisami quando aprono i
        biglietti&raquo;. Sono dati personali: usali solo per comunicazioni
        sull&apos;evento e non condividerli fuori dall&apos;organizzazione.
      </p>
      {error && <p className="text-sm text-gdg-red">{error}</p>}
      {!rows && !error && <p className="text-muted-foreground">Caricamento…</p>}
      {rows && (
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="py-2">Email</th><th>Data</th><th>Lingua</th><th>Origine</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-t border-border">
                <td className="py-2">{r.email}</td><td>{r.createdAt}</td><td>{r.locale}</td><td>{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows && rows.length === 0 && <p className="mt-4 text-muted-foreground">Nessun iscritto.</p>}
    </div>
  );
}
