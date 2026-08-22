"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { notifyContentChanged } from "./PublishBar";
import { useAdminData } from "@/hooks/useAdminData";
import { ImageField } from "./ImageField";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/types/models";

type Draft = { id?: string; name: string; roleIt: string; roleEn: string; photo: string; order: number };
const EMPTY: Draft = { name: "", roleIt: "", roleEn: "", photo: "", order: 999 };

function toDraft(m: TeamMember): Draft {
  return { id: m.id, name: m.name, roleIt: m.role.it, roleEn: m.role.en, photo: m.photo ?? "", order: m.order };
}

export function TeamAdmin() {
  const { data: initial, loading, error: loadError, reload } = useAdminData<TeamMember[]>(
    "/api/admin/team",
    (j) => (j.team as TeamMember[]) ?? [],
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
    setBusy(true);
    setError(null);
    const res = await adminFetch("/api/admin/team", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) {
      setForm(EMPTY);
      afterWrite();
    } else setError(`Errore (${res.status}).`);
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questo membro?")) return;
    const res = await adminFetch(`/api/admin/team?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) afterWrite();
    else setError(`Errore (${res.status}).`);
  }

  if (loadError) return <p className="text-sm text-gdg-red">{loadError}</p>;
  if (loading) return <p className="text-muted-foreground">Caricamento…</p>;

  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold">Team</h2>
      <table className="mb-8 w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr><th className="py-2">Nome</th><th>Ruolo (IT)</th><th>Ordine</th><th></th></tr></thead>
        <tbody>
          {initial.map((m) => (
            <tr key={m.id} className="border-t border-border">
              <td className="py-2">{m.name}</td><td>{m.role.it}</td><td>{m.order}</td>
              <td className="text-right">
                <button onClick={() => setForm(toDraft(m))} className="mr-3 text-gdg-blue hover:underline">Modifica</button>
                <button onClick={() => remove(m.id)} className="text-gdg-red hover:underline">Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rounded-2xl border border-border p-5">
        <h3 className="mb-4 font-semibold">{form.id ? "Modifica membro" : "Nuovo membro"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome" v={form.name} on={(v) => setForm({ ...form, name: v })} />
          <F label="Ruolo (IT)" v={form.roleIt} on={(v) => setForm({ ...form, roleIt: v })} />
          <F label="Ruolo (EN)" v={form.roleEn} on={(v) => setForm({ ...form, roleEn: v })} />
          <ImageField label="Foto" category="team" value={form.photo} onChange={(v) => setForm({ ...form, photo: v })} />
          <F label="Ordine" v={String(form.order)} on={(v) => setForm({ ...form, order: Number(v) || 999 })} />
        </div>
        {error && <p className="mt-3 text-sm text-gdg-red">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={busy || !form.name}>{form.id ? "Salva" : "Aggiungi"}</Button>
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
