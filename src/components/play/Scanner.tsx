"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import jsQR from "jsqr";
import { useAuth } from "@/hooks/useAuth";
import { userFetch } from "@/lib/user-client";
import { parseQrPayload } from "@/lib/gamification";
import { localized } from "@/lib/localize";
import { Button } from "@/components/ui/button";
import type { LocalizedString } from "@/types/models";

type Parsed = { checkpointId: string; token: string };
type Result =
  | { kind: "awarded"; pointsDelta: number; correct: boolean | null; newBadge: boolean }
  | { kind: "already" }
  | { kind: "error"; msg: string };

/** POST a scan; map the response to either an award result or a quiz prompt. */
async function postScan(parsed: Parsed, answer?: string) {
  const res = await userFetch("/api/scan", {
    method: "POST",
    body: JSON.stringify(answer === undefined ? parsed : { ...parsed, answer }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export function Scanner() {
  const { user, enabled, signIn } = useAuth();
  const t = useTranslations("play");
  const locale = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const [quiz, setQuiz] = useState<{ parsed: Parsed; question: LocalizedString | null } | null>(null);
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (!user) return;
    let raf = 0;
    let stream: MediaStream | null = null;
    let active = true;
    const canvas = document.createElement("canvas");

    function stop() {
      active = false; setScanning(false);
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    }

    async function handle(data: Record<string, unknown>, res: Response, parsed: Parsed) {
      if (res.ok && (data as { quiz?: unknown }).quiz) {
        setQuiz({ parsed, question: (data as { quiz: { question: LocalizedString | null } }).quiz.question });
      } else if (res.ok && (data as { already?: boolean }).already) {
        setResult({ kind: "already" });
      } else if (res.ok && (data as { awarded?: { pointsDelta: number; correct: boolean | null; newBadgeIds?: string[] } }).awarded) {
        const a = (data as { awarded: { pointsDelta: number; correct: boolean | null; newBadgeIds?: string[] } }).awarded;
        setResult({ kind: "awarded", pointsDelta: a.pointsDelta, correct: a.correct, newBadge: (a.newBadgeIds?.length ?? 0) > 0 });
      } else {
        setResult({ kind: "error", msg: t("invalidQr") });
      }
    }

    async function onDecode(text: string) {
      const parsed = parseQrPayload(text);
      stop();
      if (!parsed) { setResult({ kind: "error", msg: t("invalidQr") }); return; }
      const { res, data } = await postScan(parsed);
      await handle(data, res, parsed);
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setResult({ kind: "error", msg: t("noCamera") }); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setScanning(true);
        const tick = () => {
          if (!active || video.readyState !== video.HAVE_ENOUGH_DATA) { raf = requestAnimationFrame(tick); return; }
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height);
          if (code) { void onDecode(code.data); return; }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setResult({ kind: "error", msg: t("denied") });
      }
    }

    void start();
    return () => stop();
  }, [user, t]);

  async function submitAnswer() {
    if (!quiz) return;
    const { res, data } = await postScan(quiz.parsed, answer);
    setQuiz(null);
    if (res.ok && (data as { already?: boolean }).already) { setResult({ kind: "already" }); return; }
    const a = (data as { awarded?: { pointsDelta: number; correct: boolean | null; newBadgeIds?: string[] } }).awarded;
    if (res.ok && a) setResult({ kind: "awarded", pointsDelta: a.pointsDelta, correct: a.correct, newBadge: (a.newBadgeIds?.length ?? 0) > 0 });
    else setResult({ kind: "error", msg: t("invalidQr") });
  }

  if (!enabled) return <Shell><p className="text-muted-foreground">{t("signIn")}</p></Shell>;
  if (!user) return <Shell><Button onClick={() => void signIn()}>{t("signIn")}</Button></Shell>;

  return (
    <Shell>
      {!result && !quiz && (
        <>
          <video ref={videoRef} playsInline muted className="mx-auto aspect-square w-full max-w-sm rounded-2xl bg-black object-cover" />
          <p className="mt-3 text-sm text-muted-foreground">{scanning ? t("scanning") : "…"}</p>
        </>
      )}

      {quiz && (
        <div className="rounded-2xl border border-border p-6 text-left">
          {quiz.question && <p className="mb-3 font-medium">{localized(quiz.question, locale)}</p>}
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("answerPlaceholder")}
            className="h-11 w-full rounded-lg border border-border bg-background px-3"
          />
          <Button className="mt-3" onClick={() => void submitAnswer()} disabled={!answer.trim()}>{t("quizSubmit")}</Button>
        </div>
      )}

      {result?.kind === "awarded" && (
        <div className="rounded-2xl border border-border p-8">
          {result.correct !== null && (
            <p className={`font-medium ${result.correct ? "text-gdg-green" : "text-gdg-red"}`}>
              {result.correct ? t("correct") : t("wrong")}
            </p>
          )}
          <p className={`mt-1 font-display text-3xl font-bold ${result.pointsDelta < 0 ? "text-gdg-red" : "text-gdg-green"}`}>
            {t("delta", { points: result.pointsDelta > 0 ? `+${result.pointsDelta}` : result.pointsDelta })}
          </p>
          {result.newBadge && <p className="mt-2">{t("newBadge")}</p>}
          <Button className="mt-4" onClick={() => location.reload()}>{t("scan")}</Button>
        </div>
      )}
      {result?.kind === "already" && <Retry msg={t("already")} label={t("scan")} />}
      {result?.kind === "error" && <Retry msg={result.msg} label={t("scan")} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-xl px-5 py-16 text-center sm:px-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">DevFest Quest</h1>
      {children}
    </section>
  );
}
function Retry({ msg, label }: { msg: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border p-8">
      <p className="text-lg">{msg}</p>
      <Button className="mt-4" onClick={() => location.reload()}>{label}</Button>
    </div>
  );
}
