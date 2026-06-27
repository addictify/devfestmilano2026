"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { getDb } from "@/lib/firebase/client";
import { userFetch } from "@/lib/user-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FeedbackForm({ sessionId }: { sessionId: string }) {
  const { user, enabled, signIn } = useAuth();
  const t = useTranslations("play");
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const db = getDb();
    if (!user || !db || !open) return;
    getDoc(doc(db, "feedback", sessionId, "responses", user.uid)).then((d) => {
      if (d.exists()) { setRating(d.data().rating ?? 0); setComment(d.data().comment ?? ""); }
    });
  }, [user, open, sessionId]);

  if (!enabled) return null;

  async function submit() {
    const res = await userFetch("/api/feedback", { method: "POST", body: JSON.stringify({ sessionId, rating, comment }) });
    if (res.ok) setDone(true);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-left text-sm font-medium text-gdg-blue hover:underline">
        {t("rate")}
      </button>
    );
  }
  if (!user) {
    return <div className="mt-2"><Button size="sm" variant="outline" onClick={() => void signIn()}>{t("signIn")}</Button></div>;
  }
  if (done) return <p className="mt-2 text-sm text-gdg-green">{t("thanks")}</p>;

  return (
    <div className="mt-2 rounded-xl border border-border p-3">
      <p className="mb-1 text-sm font-medium">{t("yourRating")}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n}`} onClick={() => setRating(n)}>
            <Star className={cn("size-6", n <= rating ? "fill-gdg-yellow text-gdg-yellow" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder={t("comment")}
        className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm" rows={2} />
      <Button size="sm" className="mt-2" onClick={submit} disabled={rating < 1}>{t("submitRating")}</Button>
    </div>
  );
}
