"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { notifyContentChanged } from "./PublishBar";
import { useAdminData } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import type { Badge } from "@/lib/data/game";

type Draft = { id?: string; nameIt: string; nameEn: string; descIt: string; descEn: string; icon: string; milestone: string };
const EMPTY: Draft = { nameIt: "", nameEn: "", descIt: "", descEn: "", icon: "🏅", milestone: "" };
const toDraft = (b: Badge): Draft => ({
  id: b.id, nameIt: b.name.it, nameEn: b.name.en, descIt: b.description.it, descEn: b.description.en,
  icon: b.icon, milestone: b.milestone ? String(b.milestone) : "",
});

export function BadgesAdmin() {
  const { data: initial, loading, error: loadError, reload } = useAdminData<Badge[]>(
    "/api/admin/badges",
    (j) => (j.badges as Badge[]) ?? [],
    [],
  );
  const [form, setForm] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload the list and let the publish banner know the live site is now
  // behind the data.
  const afterWrite = () => {
    void reload();
    notifyContentChanged();
  };

  async function save() {
    setBusy(true); setError(null);
    const res = await adminFetch("/api/admin/badges", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) { setForm(EMPTY); afterWrite(); } else setError(`Errore (${res.status}).`);
  }
  async function remove(id: string) {
    if (!confirm("Eliminare questo badge?")) return;
    const res = await adminFetch(`/api/admin/badges?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) afterWrite(); else setError(`Errore (${res.status}).`);
  }

  if (loadError) return <p className="text-sm text-gdg-red">{loadError}</p>;
  if (loading) return <p className="text-muted-foreground">Caricamento…</p>;

  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold">Badge</h2>
      <table className="mb-8 w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr><th className="py-2">Icona</th><th>Nome (IT)</th><th>Milestone</th><th></th></tr></thead>
        <tbody>
          {initial.map((b) => (
            <tr key={b.id} className="border-t border-border">
              <td className="py-2 text-lg">{b.icon}</td><td>{b.name.it}</td><td>{b.milestone ?? "—"}</td>
              <td className="text-right">
                <button onClick={() => setForm(toDraft(b))} className="mr-3 text-gdg-blue hover:underline">Modifica</button>
                <button onClick={() => remove(b.id)} className="text-gdg-red hover:underline">Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rounded-2xl border border-border p-5">
        <h3 className="mb-4 font-semibold">{form.id ? "Modifica badge" : "Nuovo badge"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome (IT)" v={form.nameIt} on={(v) => setForm({ ...form, nameIt: v })} />
          <F label="Nome (EN)" v={form.nameEn} on={(v) => setForm({ ...form, nameEn: v })} />
          <F label="Descrizione (IT)" v={form.descIt} on={(v) => setForm({ ...form, descIt: v })} />
          <F label="Descrizione (EN)" v={form.descEn} on={(v) => setForm({ ...form, descEn: v })} />
          <F label="Icona (emoji o URL)" v={form.icon} on={(v) => setForm({ ...form, icon: v })} />
          <F label="Milestone (n. scan, vuoto = nessuna)" v={form.milestone} on={(v) => setForm({ ...form, milestone: v })} />
        </div>
        {error && <p className="mt-3 text-sm text-gdg-red">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={busy || !form.nameIt}>{form.id ? "Salva" : "Aggiungi"}</Button>
          {form.id && <Button variant="ghost" onClick={() => setForm(EMPTY)}>Annulla</Button>}
        </div>
      </div>
    </div>
  );
}

function F({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <label className="text-sm">{label}
      <input value={v} onChange={(e) => on(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" />
    </label>
  );
}
