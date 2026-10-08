"use client";

/** Title and text inputs with a live character count, for composing and
 *  editing announcements. */
export function Field({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}{" "}
        <span className="font-mono text-xs text-muted-foreground">
          {value.length}/{max}
        </span>
      </span>
      <input
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gdg-blue"
      />
    </label>
  );
}

export function Area({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">
        {label}{" "}
        <span className="font-mono text-xs text-muted-foreground">
          {value.length}/{max}
        </span>
      </span>
      <textarea
        value={value}
        maxLength={max}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-gdg-blue"
      />
    </label>
  );
}
