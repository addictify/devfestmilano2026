"use client";

import { useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-client";

/**
 * URL field with an upload button next to it.
 *
 * The URL stays editable by hand — some logos are better linked from the
 * sponsor's own CDN than copied — so this adds a path rather than replacing
 * one. A successful upload just writes its URL into the same field.
 */
export function ImageField({
  label,
  value,
  onChange,
  category,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  category: "sponsors" | "team" | "misc";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("category", category);
      const res = await adminFetch("/api/admin/upload", { method: "POST", body });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        // Surface the actual reason: "too big" and "wrong format" need
        // different fixes, and a generic failure leaves you guessing.
        const reason =
          json?.reason === "too-large"
            ? `File troppo grande (max ${Math.round((json.maxBytes ?? 0) / 1024 / 1024)} MB)`
            : json?.reason === "bad-type"
              ? "Formato non supportato (PNG, JPEG, WebP, SVG, GIF)"
              : json?.reason === "unconfigured"
                ? "Storage non configurato"
                : `Upload fallito (${res.status})`;
        setError(reason);
        return;
      }
      onChange(json.url);
    } catch {
      setError("Upload fallito: rete non disponibile");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <label className="block text-sm">
      {label}
      <div className="mt-1 flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… oppure carica un file"
          className="h-10 w-full rounded-lg border border-border bg-background px-3"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="h-10 shrink-0 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {busy ? "Carico…" : "Carica"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-gdg-red" role="alert">
          {error}
        </p>
      )}
      {value && !error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="mt-2 h-12 w-auto rounded border border-border bg-white object-contain p-1"
        />
      )}
    </label>
  );
}
