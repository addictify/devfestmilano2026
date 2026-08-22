"use client";

import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading, enabled, signIn } = useAuth();
  const isAdmin = useIsAdmin();

  if (!enabled) return <Shell>Backend non configurato.</Shell>;
  if (loading) return <Shell>Caricamento…</Shell>;
  if (!user)
    return (
      <Shell>
        <p className="mb-4">Accedi con un account amministratore.</p>
        <Button onClick={() => void signIn()}>Accedi</Button>
      </Shell>
    );
  if (isAdmin === null) return <Shell>Verifica permessi…</Shell>;
  if (!isAdmin) return <Shell>Accesso negato. Questo account non è amministratore.</Shell>;
  return <>{children}</>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="mb-4 font-display text-2xl font-bold">Admin</h1>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
