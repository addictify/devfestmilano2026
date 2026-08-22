import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminBucket } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

/**
 * Image upload for the admin forms, which previously only took pasted URLs.
 *
 * Uploading through the server rather than straight from the browser keeps the
 * Storage rules able to deny all client writes: the Admin SDK bypasses them, so
 * the only way in is past verifyAdmin, and validation can't be skipped by
 * calling Storage directly.
 */

// Only these land under images/<category>/, so a caller can't write anywhere.
const CATEGORIES = ["sponsors", "team", "misc"] as const;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];

/** Keep something human-readable in the object name, drop everything risky. */
function safeName(original: string) {
  const dot = original.lastIndexOf(".");
  const stem = (dot > 0 ? original.slice(0, dot) : original)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const ext = (dot > 0 ? original.slice(dot + 1) : "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  return `${stem || "image"}-${randomUUID().slice(0, 8)}${ext ? "." + ext : ""}`;
}

export async function POST(req: Request) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const bucket = getAdminBucket();
  if (!bucket) {
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const category = String(form?.get("category") ?? "misc");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "no-file" }, { status: 400 });
  }
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ ok: false, reason: "bad-category" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { ok: false, reason: "bad-type", allowed: ALLOWED },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, reason: "too-large", maxBytes: MAX_BYTES },
      { status: 413 },
    );
  }

  const objectPath = `images/${category}/${safeName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await bucket.file(objectPath).save(buffer, {
      contentType: file.type,
      // Logos change rarely and every upload gets a fresh name, so they can be
      // cached hard.
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });
  } catch (error) {
    console.error("[upload] storage write failed:", error);
    return NextResponse.json({ ok: false, reason: "storage-error" }, { status: 502 });
  }

  // Served through the Firebase Storage endpoint, which honours storage.rules
  // (images/** is world-readable) — no per-object ACL needed, so this keeps
  // working under uniform bucket-level access.
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media`;

  return NextResponse.json({ ok: true, url, path: objectPath });
}
