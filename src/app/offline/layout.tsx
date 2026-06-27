import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning className={fontVariables}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
