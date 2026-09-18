"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { getDb } from "@/lib/firebase/client";
import { userFetch } from "@/lib/user-client";
import { invalidateRatings } from "@/lib/feedback-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FeedbackForm({ sessionId }: { sessionId: string }) {
  const { user, enabled, signIn } = useAuth();
  const t = useTranslations("play");
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Load any existing vote as soon as we know who's asking, not when the form
  // is opened. One response per person is enforced by the document id, but the
  // UI used to show a bare "rate this session" on every visit — indistinguish-
  // able from being able to vote again and again.
  useEffect(() => {
    const db = getDb();
    if (!user || !db) return;
    let active = true;
    getDoc(doc(db, "feedback", sessionId, "responses", user.uid))
      .then((d) => {
        if (!active || !d.exists()) return;
        setRating(d.data().rating ?? 0);
        setComment(d.data().comment ?? "");
        setSubmitted(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, sessionId]);

  if (!enabled) return null;

  async function submit() {
    const res = await userFetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ sessionId, rating, comment }),
    });
    if (res.ok) {
      setSubmitted(true);
      setOpen(false);
      invalidateRatings();
    }
  }

  if (!open) {
    // Already voted: show what they said, and that changing it replaces it.
    if (submitted && rating > 0) {
      return (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("yourRating")}</span>
          <span className="inline-flex" aria-label={`${rating}/5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                aria-hidden
                className={cn(
                  "size-4",
                  n <= rating
                    ? "fill-gdg-yellow text-gdg-yellow"
                    : "text-muted-foreground/40",
                )}
              />
            ))}
          </span>
          <button
            onClick={() => setOpen(true)}
            className="font-medium text-gdg-blue hover:underline"
          >
            {t("editRating")}
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-left text-sm font-medium text-gdg-blue hover:underline"
      >
        {t("rate")}
      </button>
    );
  }

  if (!user) {
    return (
      <div className="mt-2">
        <Button size="sm" variant="outline" onClick={() => void signIn()}>
          {t("signIn")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-border p-3">
      <p className="mb-1 text-sm font-medium">{t("yourRating")}</p>
      <p className="mb-2 text-xs text-muted-foreground">{t("oneVote")}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n}`} onClick={() => setRating(n)}>
            <Star className={cn("size-6", n <= rating ? "fill-gdg-yellow text-gdg-yellow" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder={t("comment")}
        className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm" rows={2} />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={rating < 1}>
          {submitted ? t("updateRating") : t("submitRating")}
        </Button>
        {submitted && (
          <button
            onClick={() => setOpen(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("cancelRating")}
          </button>
        )}
      </div>
    </div>
  );
}
