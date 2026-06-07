import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

// On-demand ISR refresh. Call after content changes:
//   POST /api/revalidate?secret=YOUR_SECRET
export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Refresh the locale roots and the data-driven listing pages.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/speakers`);
    revalidatePath(`/${locale}/agenda`);
    revalidatePath(`/${locale}/sponsors`);
  }
  // Dynamic speaker detail pages.
  revalidatePath("/[locale]/speakers/[id]", "page");

  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
}
