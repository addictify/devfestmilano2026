import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
