"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { SPONSOR_TIERS, type Sponsor } from "@/types/models";

const EMPTY: Partial<Sponsor> = { name: "", tier: "gold", website: "", logoLight: "", logoDark: "", order: 999, active: true };

export function SponsorsAdmin({ initial }: { initial: Sponsor[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Sponsor>>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await adminFetch("/api/admin/sponsors", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) {
      setForm(EMPTY);
      router.refresh();
    } else {
      setError(`Errore (${res.status}).`);
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questo sponsor?")) return;
    const res = await adminFetch(`/api/admin/sponsors?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setError(`Errore (${res.status}).`);
    }
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold">Sponsor</h2>

      <table className="mb-8 w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="py-2">Nome</th><th>Tier</th><th>Ordine</th><th>Attivo</th><th></th></tr>
        </thead>
        <tbody>
          {initial.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="py-2">{s.name}</td>
              <td>{s.tier}</td>
              <td>{s.order}</td>
              <td>{s.active ? "sì" : "no"}</td>
              <td className="text-right">
                <button onClick={() => setForm(s)} className="mr-3 text-gdg-blue hover:underline">Modifica</button>
                <button onClick={() => remove(s.id)} className="text-gdg-red hover:underline">Elimina</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rounded-2xl border border-border p-5">
        <h3 className="mb-4 font-semibold">{form.id ? "Modifica sponsor" : "Nuovo sponsor"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" value={form.name ?? ""} onChange={(v) => setForm({ ...form, name: v })} />
          <label className="text-sm">Tier
            <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as Sponsor["tier"] })}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2">
              {SPONSOR_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <Field label="Sito web" value={form.website ?? ""} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="Ordine" value={String(form.order ?? 999)} onChange={(v) => setForm({ ...form, order: Number(v) || 999 })} />
          <Field label="Logo (light) URL" value={form.logoLight ?? ""} onChange={(v) => setForm({ ...form, logoLight: v })} />
          <Field label="Logo (dark) URL" value={form.logoDark ?? ""} onChange={(v) => setForm({ ...form, logoDark: v })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Attivo
          </label>
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm">{label}
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" />
    </label>
  );
}
