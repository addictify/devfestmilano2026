import { NextResponse } from "next/server";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { aggregate } from "@/lib/feedback-stats";
import { getSessions } from "@/lib/data/content";
import { getSubscriberRows } from "@/lib/data/subscribers";
import { getBadges, getCheckpoints } from "@/lib/data/game";
import {
  bump,
  countByDay,
  countWithin,
  mean1,
  savedBuckets,
  scanThresholds,
  topN,
} from "@/lib/dashboard-stats";
import { PUSH_COLLECTION } from "@/lib/push/send";

export const dynamic = "force-dynamic";

const HOUR = 3_600_000;

/**
 * One section failing (a missing IAM role, a quota blip) must not blank the
 * whole dashboard on the day it matters. The section reports null and the page
 * says it is unavailable.
 */
async function safe<T>(label: string, work: () => Promise<T>): Promise<T | null> {
  try {
    return await work();
  } catch (error) {
    console.error(`[dashboard] ${label} failed:`, error);
    return null;
  }
}

/** Every Firebase Auth account, a page of 1000 at a time. */
async function listAccounts() {
  const auth = getAdminAuth();
  if (!auth) throw new Error("auth unconfigured");
  const created: Date[] = [];
  const lastSeen: Date[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      created.push(new Date(u.metadata.creationTime));
      // Never signed in again after creation still has a lastSignInTime; an
      // account created by an admin and never used does not.
      if (u.metadata.lastSignInTime) lastSeen.push(new Date(u.metadata.lastSignInTime));
    }
    pageToken = page.pageToken;
  } while (pageToken);
  const now = new Date();
  return {
    total: created.length,
    newLast24h: countWithin(created, now, 24 * HOUR),
    activeLast24h: countWithin(lastSeen, now, 24 * HOUR),
    activeLast7d: countWithin(lastSeen, now, 7 * 24 * HOUR),
    signupsByDay: countByDay(created),
  };
}

/** uid → saved session ids, from every users/{uid}/favorites. */
async function readFavourites(db: Firestore) {
  const snap = await db.collectionGroup("favorites").get();
  const byUser = new Map<string, string[]>();
  snap.forEach((d) => {
    const uid = d.ref.parent.parent?.id;
    if (!uid) return;
    const list = byUser.get(uid) ?? [];
    list.push(d.id);
    byUser.set(uid, list);
  });
  return byUser;
}

/** Notification devices. Endpoints and keys are capabilities: never leave here. */
async function readPush(db: Firestore) {
  const snap = await db.collection(PUSH_COLLECTION).get();
  const created: Date[] = [];
  let signedIn = 0;
  let it = 0;
  const uids = new Set<string>();
  snap.forEach((d) => {
    const x = d.data();
    if (typeof x.uid === "string" && x.uid) {
      signedIn++;
      uids.add(x.uid);
    }
    if (x.locale === "it") it++;
    const ts = x.createdAt as { toDate?: () => Date } | undefined;
    if (ts?.toDate) created.push(ts.toDate());
  });
  return {
    devices: snap.size,
    signedIn,
    anonymous: snap.size - signedIn,
    it,
    en: snap.size - it,
    uids,
    withHistory: created.length,
    signupsByDay: countByDay(created),
  };
}

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const [sessions, subscribers, checkpoints, badges, accounts, favourites, push, events, announcements] =
    await Promise.all([
      getSessions(),
      getSubscriberRows(),
      getCheckpoints(),
      getBadges(),
      safe("accounts", listAccounts),
      safe("favourites", () => readFavourites(db)),
      safe("push", () => readPush(db)),
      safe("events", async () => {
        const doc = await db.collection("metrics").doc("events").get();
        const x = doc.data() ?? {};
        return {
          counts: (x.counts ?? {}) as Record<string, number>,
          daily: (x.daily ?? {}) as Record<string, Record<string, number>>,
        };
      }),
      safe("announcements", async () => (await db.collection("announcements").count().get()).data().count),
    ]);

  // Feedback per session — one round-trip each, so fan them out rather than
  // walking the sessions serially. Raters are kept as a set of uids to size the
  // funnel; only the count leaves this function.
  const raters = new Set<string>();
  const allRatings: number[] = [];
  let commentCount = 0;
  const feedback = (
    await Promise.all(
      sessions
        .filter((x) => !x.isServiceSession)
        .map(async (s) => {
          const snap = await db.collection("feedback").doc(s.id).collection("responses").get();
          if (snap.empty) return null;
          const responses = snap.docs.map((d) => {
            raters.add(d.id);
            return { rating: d.data().rating as number, comment: d.data().comment as string | undefined };
          });
          const agg = aggregate(responses);
          for (const r of responses) if (r.rating >= 1 && r.rating <= 5) allRatings.push(r.rating);
          commentCount += agg.comments.length;
          return {
            sessionId: s.id,
            title: s.title,
            room: s.roomName ?? null,
            count: agg.count,
            average: agg.average,
            distribution: agg.distribution,
            comments: agg.comments,
          };
        }),
    )
  ).filter((x) => x !== null);

  // Gamification: scans per checkpoint + per player, badge distribution, leaderboard.
  const profiles = await db.collection("gameProfiles").get();
  const badgeCounts: Record<string, number> = {};
  let players = 0;
  profiles.forEach((p) => {
    players++;
    for (const b of (p.data().badgeIds ?? []) as string[]) badgeCounts[b] = (badgeCounts[b] ?? 0) + 1;
  });
  // Scan doc ids are checkpoint ids; checkpoints with no scans fall back to 0
  // where they're read below.
  const scanCounts: Record<string, number> = {};
  const scansByPlayer = new Map<string, number>();
  const scansCG = await db.collectionGroup("scans").get();
  scansCG.forEach((d) => {
    scanCounts[d.id] = (scanCounts[d.id] ?? 0) + 1;
    const uid = d.ref.parent.parent?.id;
    if (uid) bump(scansByPlayer, uid);
  });
  const lb = await db.collection("leaderboard").orderBy("points", "desc").limit(10).get();
  const leaderboard = lb.docs.map((d) => ({ displayName: d.data().displayName as string, points: d.data().points as number }));

  // Personal agendas.
  const agendas = favourites && (() => {
    const bySession = new Map<string, number>();
    const byRoom = new Map<string, number>();
    const byId = new Map(sessions.map((s) => [s.id, s]));
    let totalSaves = 0;
    for (const ids of favourites.values()) {
      for (const id of ids) {
        totalSaves++;
        bump(bySession, id);
        const room = byId.get(id)?.roomName;
        if (room) bump(byRoom, room);
      }
    }
    const perUser = [...favourites.values()].map((ids) => ids.length);
    return {
      users: favourites.size,
      totalSaves,
      average: mean1(perUser),
      buckets: savedBuckets(perUser),
      top: topN(bySession, 10).map(({ id, count }) => {
        const s = byId.get(id);
        return { id, count, title: s?.title ?? id, room: s?.roomName ?? null, startsAt: s?.startsAt ?? null };
      }),
      byRoom: topN(byRoom, 10).map(({ id, count }) => ({ room: id, count })),
    };
  })();

  // Devices that can actually get a session reminder: signed in, and with
  // something saved to be reminded of.
  const reminderReady =
    push && favourites ? [...push.uids].filter((uid) => (favourites.get(uid)?.length ?? 0) > 0).length : null;

  const scannedPlayers = [...scansByPlayer.values()];
  const pushOut = push && {
    devices: push.devices,
    signedIn: push.signedIn,
    anonymous: push.anonymous,
    it: push.it,
    en: push.en,
    signedInPeople: push.uids.size,
    reminderReady,
    withHistory: push.withHistory,
    signupsByDay: push.signupsByDay,
  };

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    subscribers: subscribers.length,
    accounts,
    push: pushOut,
    pushEvents: events,
    announcements,
    agendas,
    funnel: accounts && agendas && push
      ? {
          accounts: accounts.total,
          withAgenda: agendas.users,
          withPush: push.uids.size,
          playing: scansByPlayer.size,
          rated: raters.size,
        }
      : null,
    feedback,
    feedbackSummary: {
      responses: allRatings.length,
      raters: raters.size,
      average: mean1(allRatings),
      comments: commentCount,
    },
    game: {
      players,
      scanners: scansByPlayer.size,
      thresholds: scanThresholds(scannedPlayers),
      checkpoints: checkpoints.map((c) => ({ id: c.id, name: c.name, scans: scanCounts[c.id] ?? 0 })),
      badges: badges.map((b) => ({ id: b.id, name: b.name, icon: b.icon, holders: badgeCounts[b.id] ?? 0 })),
      leaderboard,
    },
  });
}
