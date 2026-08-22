"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

type AdminRow = {
  uid: string;
  email: string | null;
  displayName: string | null;
  bootstrap: boolean;
  lastSignInAt: string | null;
};

const REFUSALS: Record<string, string> = {
  self: "Non puoi rimuovere te stesso.",
  bootstrap: "Questo è l'amministratore predefinito e non può essere rimosso.",
  "last-admin": "È l'ultimo amministratore rimasto.",
  "invalid-email": "Indirizzo email non valido.",
  "not-found": "Utente non trovato.",
  unconfigured: "Backend non configurato.",
};

export function AdminsAdmin() {
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [callerUid, setCallerUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    const res = await adminFetch("/api/admin/admins");
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(REFUSALS[json?.reason] ?? "Caricamento non riuscito.");
    }
    return json as { admins: AdminRow[]; callerUid: string };
  }, []);

  // setState only from the callback, never straight from the effect body.
  const load = useCallback(
    () =>
      fetchAdmins()
        .then((json) => {
          setAdmins(json.admins);
          setCallerUid(json.callerUid);
        })
        .catch((e: Error) => {
          setError(e.message);
          setAdmins([]);
        }),
    [fetchAdmins],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await adminFetch("/api/admin/admins", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok || !json?.ok) {
      setError(REFUSALS[json?.reason] ?? `Operazione non riuscita (${res.status}).`);
      return;
    }
    setNotice(
      json.alreadyAdmin
        ? "Era già amministratore."
        : json.created
          ? "Aggiunto. L'account è stato creato: sarà amministratore al primo accesso."
          : "Aggiunto. Deve uscire e rientrare perché il permesso sia attivo.",
    );
    setEmail("");
    await load();
  }

  async function remove(row: AdminRow) {
    const who = row.email ?? row.uid;
    if (!confirm(`Rimuovere i permessi di amministratore a ${who}?`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await adminFetch(`/api/admin/admins?uid=${encodeURIComponent(row.uid)}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok || !json?.ok) {
      setError(REFUSALS[json?.reason] ?? `Rimozione non riuscita (${res.status}).`);
      return;
    }
    setNotice(`Permessi rimossi a ${who}.`);
    await load();
  }

  return (
    <section>
      <h1 className="font-display text-2xl font-bold tracking-tight">Amministratori</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Chi può accedere a questo pannello. Il permesso viene letto dal token di
        accesso, quindi diventa effettivo al successivo accesso della persona.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-gdg-red/30 bg-gdg-red/5 px-4 py-2 text-sm" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-2 text-sm" role="status">
          {notice}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Ultimo accesso</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {admins === null && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-muted-foreground">
                  Caricamento…
                </td>
              </tr>
            )}
            {admins?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-muted-foreground">
                  Nessun amministratore.
                </td>
              </tr>
            )}
            {admins?.map((a) => (
              <tr key={a.uid} className="border-t border-border">
                <td className="px-4 py-2">
                  {a.email ?? a.uid}
                  {a.bootstrap && (
                    <span className="ml-2 rounded-full border border-border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                      predefinito
                    </span>
                  )}
                  {a.uid === callerUid && (
                    <span className="ml-2 text-xs text-muted-foreground">(tu)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {a.lastSignInAt
                    ? new Date(a.lastSignInAt).toLocaleDateString("it-IT")
                    : "mai"}
                </td>
                <td className="px-4 py-2 text-right">
                  {/* The same rules are enforced server-side; disabling here
                      just explains why instead of failing on click. */}
                  {a.bootstrap || a.uid === callerUid ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <button
                      onClick={() => void remove(a)}
                      disabled={busy}
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-gdg-red hover:text-gdg-red disabled:opacity-50"
                    >
                      Rimuovi
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <h2 className="font-display text-lg font-semibold">Aggiungi amministratore</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
            placeholder="persona@esempio.com"
            className="h-10 min-w-64 flex-1 rounded-lg border border-border bg-background px-3"
          />
          <button
            onClick={() => void add()}
            disabled={busy || !email.trim()}
            className="h-10 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            Aggiungi
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Se la persona non ha ancora un account, viene creato ora: sarà
          amministratore già al primo accesso con Google.
        </p>
      </div>
    </section>
  );
}
