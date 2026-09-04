"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { adminFetch } from "@/lib/admin-client";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { notifyContentChanged } from "./PublishBar";
import { Button } from "@/components/ui/button";
import type { Badge, Checkpoint } from "@/lib/data/game";

type Draft = {
  id?: string; nameIt: string; nameEn: string; points: string; badgeId: string; active: boolean;
  questionIt: string; questionEn: string; answer: string; quizMode: "" | "add" | "multiply"; quizValue: string; wrongPenalty: string;
};
const EMPTY: Draft = {
  nameIt: "", nameEn: "", points: "10", badgeId: "", active: true,
  questionIt: "", questionEn: "", answer: "", quizMode: "", quizValue: "", wrongPenalty: "",
};
const toDraft = (c: Checkpoint): Draft => ({
  id: c.id, nameIt: c.name.it, nameEn: c.name.en, points: String(c.points), badgeId: c.badgeId ?? "", active: c.active,
  questionIt: c.question?.it ?? "", questionEn: c.question?.en ?? "", answer: c.answer ?? "",
  quizMode: c.quizMode ?? "", quizValue: c.quizValue != null ? String(c.quizValue) : "",
  wrongPenalty: c.wrongPenalty != null ? String(c.wrongPenalty) : "",
});

type Loaded = { checkpoints: Checkpoint[]; badges: Badge[] };

async function fetchCheckpoints(): Promise<Loaded> {
  const res = await adminFetch("/api/admin/checkpoints");
  if (!res.ok) throw res.status;
  return res.json();
}

// Data is fetched client-side rather than passed in as props — see the comment on
// GET /api/admin/checkpoints for why these docs must not be server-rendered.
export function CheckpointsAdmin() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[] | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [form, setForm] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<{ name: string; dataUrl: string } | null>(null);

  function apply(d: Loaded) {
    setCheckpoints(d.checkpoints);
    setBadges(d.badges);
  }

  useEffect(() => {
    fetchCheckpoints()
      .then(apply)
      .catch((s) => setError(`Errore (${s}).`));
  }, []);

  const reload = () => fetchCheckpoints().then(apply).catch((s) => setError(`Errore (${s}).`));

  // Reload the list and let the publish banner know the live site is now
  // behind the data.
  const afterWrite = () => {
    void reload();
    notifyContentChanged();
  };

  async function save() {
    setBusy(true); setError(null);
    const res = await adminFetch("/api/admin/checkpoints", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (res.ok) { setForm(EMPTY); afterWrite(); } else setError(`Errore (${res.status}).`);
  }
  async function remove(id: string) {
    if (!confirm("Eliminare questo checkpoint?")) return;
    const res = await adminFetch(`/api/admin/checkpoints?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) afterWrite(); else setError(`Errore (${res.status}).`);
  }
  async function showQr(c: Checkpoint) {
    const dataUrl = await QRCode.toDataURL(`DFQ:${c.id}:${c.secret}`, { width: 512, margin: 2 });
    setQr({ name: c.name.it, dataUrl });
  }

  return (
    <div>
      <AdminSectionHeader title="Checkpoint">
        I punti da scansionare in venue durante l&apos;evento, con i punti che valgono e un eventuale quiz. Ogni checkpoint genera un QR che contiene un codice segreto: stampalo da qui e non diffonderlo altrove, perché chi lo conosce può ottenere i punti senza essere presente.
      </AdminSectionHeader>
      {!checkpoints && !error && <p className="mb-8 text-muted-foreground">Caricamento…</p>}
      {checkpoints && (
        <table className="mb-8 w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="py-2">Nome (IT)</th><th>Punti</th><th>Attivo</th><th></th></tr></thead>
          <tbody>
            {checkpoints.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="py-2">{c.name.it}</td><td>{c.points}</td><td>{c.active ? "sì" : "no"}</td>
                <td className="text-right">
                  <button onClick={() => showQr(c)} className="mr-3 text-gdg-green hover:underline">QR</button>
                  <button onClick={() => setForm(toDraft(c))} className="mr-3 text-gdg-blue hover:underline">Modifica</button>
                  <button onClick={() => remove(c.id)} className="text-gdg-red hover:underline">Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {qr && (
        <div className="mb-8 rounded-2xl border border-border p-5 text-center print:border-0">
          <p className="mb-3 font-semibold">{qr.name}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.dataUrl} alt={`QR ${qr.name}`} className="mx-auto size-64" />
          <div className="mt-3 flex justify-center gap-2 print:hidden">
            <Button size="sm" onClick={() => window.print()}>Stampa</Button>
            <Button size="sm" variant="ghost" onClick={() => setQr(null)}>Chiudi</Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border p-5 print:hidden">
        <h3 className="mb-4 font-semibold">{form.id ? "Modifica checkpoint" : "Nuovo checkpoint"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome (IT)" v={form.nameIt} on={(v) => setForm({ ...form, nameIt: v })} />
          <F label="Nome (EN)" v={form.nameEn} on={(v) => setForm({ ...form, nameEn: v })} />
          <F label="Punti" v={form.points} on={(v) => setForm({ ...form, points: v })} />
          <label className="text-sm">Badge (opzionale)
            <select value={form.badgeId} onChange={(e) => setForm({ ...form, badgeId: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2">
              <option value="">— nessuno —</option>
              {badges.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name.it}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Attivo
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-border p-4">
          <p className="mb-3 text-sm font-semibold">Quiz (facoltativo)</p>
          <label className="text-sm">Modalità
            <select value={form.quizMode} onChange={(e) => setForm({ ...form, quizMode: e.target.value as Draft["quizMode"] })}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2">
              <option value="">Nessun quiz</option>
              <option value="add">Aggiungi punti (base + valore)</option>
              <option value="multiply">Moltiplica punti (base × valore)</option>
            </select>
          </label>
          {form.quizMode && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <F label="Domanda (IT)" v={form.questionIt} on={(v) => setForm({ ...form, questionIt: v })} />
              <F label="Domanda (EN)" v={form.questionEn} on={(v) => setForm({ ...form, questionEn: v })} />
              <F label="Risposta corretta" v={form.answer} on={(v) => setForm({ ...form, answer: v })} />
              <F label={form.quizMode === "multiply" ? "Moltiplicatore" : "Punti bonus"} v={form.quizValue} on={(v) => setForm({ ...form, quizValue: v })} />
              <F label="Penalità se sbagliato" v={form.wrongPenalty} on={(v) => setForm({ ...form, wrongPenalty: v })} />
            </div>
          )}
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
