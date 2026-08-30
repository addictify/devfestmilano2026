import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { takeTouchedPaths } from "./shims/next-cache.js";
import { markPendingPublish } from "@/lib/publish";

// The Next route handlers, reused as-is. Each exports plain
// (Request) => Response functions, so nothing here reimplements their rules.
import * as subscribe from "@/app/api/subscribe/route";
import * as feedback from "@/app/api/feedback/route";
import * as scan from "@/app/api/scan/route";
import * as playProfile from "@/app/api/play/profile/route";
import * as sync from "@/app/api/sync/route";
import * as adminAdmins from "@/app/api/admin/admins/route";
import * as adminBadges from "@/app/api/admin/badges/route";
import * as adminCheckpoints from "@/app/api/admin/checkpoints/route";
import * as adminConfig from "@/app/api/admin/config/route";
import * as adminDashboard from "@/app/api/admin/dashboard/route";
import * as adminSponsors from "@/app/api/admin/sponsors/route";
import * as adminSubscribers from "@/app/api/admin/subscribers/route";
import * as adminSubscribersExport from "@/app/api/admin/subscribers/export/route";
import * as adminTeam from "@/app/api/admin/team/route";
import * as adminUpload from "@/app/api/admin/upload/route";
import * as adminPublish from "@/app/api/admin/publish/route";

type Handler = (req: Request) => Promise<Response> | Response;
type RouteModule = Partial<Record<"GET" | "POST" | "PUT" | "DELETE" | "PATCH", Handler>>;

// Paths mirror the Next routes exactly, so the client only changes origin.
const ROUTES: Record<string, RouteModule> = {
  "/api/subscribe": subscribe,
  "/api/feedback": feedback,
  "/api/scan": scan,
  "/api/play/profile": playProfile,
  "/api/sync": sync,
  "/api/admin/admins": adminAdmins,
  "/api/admin/badges": adminBadges,
  "/api/admin/checkpoints": adminCheckpoints,
  "/api/admin/config": adminConfig,
  "/api/admin/dashboard": adminDashboard,
  "/api/admin/sponsors": adminSponsors,
  "/api/admin/subscribers": adminSubscribers,
  "/api/admin/subscribers/export": adminSubscribersExport,
  "/api/admin/team": adminTeam,
  "/api/admin/upload": adminUpload,
  "/api/admin/publish": adminPublish,
};

/**
 * Origins allowed to call this API. The static frontend is served from a
 * different host than the API, so every browser call is cross-origin and needs
 * these to be right — an omission here looks like a broken site, not a CORS
 * error, to anyone but the developer.
 */
const ALLOWED_ORIGINS = [
  "https://2026.devfestmilano.it",
  "https://addictify.github.io",
  "http://localhost:3100",
  "http://localhost:3000",
];

// What the admin banner shows as "what changed".
const LABELS: Record<string, string> = {
  "/api/admin/sponsors": "sponsor",
  "/api/admin/team": "team",
  "/api/admin/config": "configurazione",
  "/api/admin/badges": "badge",
  "/api/admin/checkpoints": "checkpoint",
  "/api/admin/upload": "immagine",
  "/api/sync": "sync Sessionize",
};

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-max-age": "3600",
    vary: "origin",
  };
}

/** Express-style request → the Web Request the handlers expect. */
function toWebRequest(req: import("firebase-functions/v2/https").Request): Request {
  const url = `https://${req.headers.host ?? "localhost"}${req.originalUrl ?? req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  const method = req.method.toUpperCase();
  return new Request(url, {
    method,
    headers,
    // rawBody preserves the exact bytes, which multipart uploads depend on —
    // req.body has already been parsed and would lose the boundary framing.
    body:
      method === "GET" || method === "HEAD"
        ? undefined
        : new Uint8Array(req.rawBody ?? Buffer.alloc(0)),
  });
}

// Secrets are declared per function, so everything any route needs at runtime
// has to be listed here — a route whose secret is missing fails only when
// someone calls it.
//   GITHUB_REBUILD_TOKEN  → /api/admin/publish dispatches the rebuild
//   SESSIONIZE_EVENT_ID   → /api/sync fetches the schedule
//   CRON_SECRET           → authorizes the scheduled sync
//   REVALIDATE_SECRET     → authorizes a manual sync
const GITHUB_TOKEN = defineSecret("GITHUB_REBUILD_TOKEN");
const SESSIONIZE_EVENT_ID = defineSecret("SESSIONIZE_EVENT_ID");
const CRON_SECRET = defineSecret("CRON_SECRET");
const REVALIDATE_SECRET = defineSecret("REVALIDATE_SECRET");

export const api = onRequest(
  {
    region: "europe-west1",
    secrets: [GITHUB_TOKEN, SESSIONIZE_EVENT_ID, CRON_SECRET, REVALIDATE_SECRET],
    cors: false,
    maxInstances: 10,
  },
  async (req, res) => {
    const cors = corsHeaders(req.headers.origin);

    if (req.method === "OPTIONS") {
      res.status(204).set(cors).send("");
      return;
    }

    const path = (req.path || "/").replace(/\/+$/, "") || "/";
    const route = ROUTES[path];
    if (!route) {
      res.status(404).set(cors).json({ ok: false, reason: "not-found" });
      return;
    }

    const handler = route[req.method.toUpperCase() as keyof RouteModule];
    if (!handler) {
      res.status(405).set(cors).json({ ok: false, reason: "method-not-allowed" });
      return;
    }

    let response: Response;
    try {
      response = await handler(toWebRequest(req));
    } catch (error) {
      logger.error("[api] handler threw", { path, error: String(error) });
      res.status(500).set(cors).json({ ok: false, reason: "internal" });
      return;
    }

    // One entry per edit, not one per invalidated locale path.
    const touched = takeTouchedPaths();
    if (touched.length > 0 && response.ok) {
      await markPendingPublish(LABELS[path] ?? path.replace("/api/admin/", ""));
    }

    const body = Buffer.from(await response.arrayBuffer());
    const headers: Record<string, string> = { ...cors };
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    res.status(response.status).set(headers).send(body);
  },
);
