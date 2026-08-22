import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyAdmin } from "@/lib/auth/admin-guard";
import { aggregate } from "@/lib/feedback-stats";
import { getSessions } from "@/lib/data/content";
import { getSubscriberRows } from "@/lib/data/subscribers";
import { getBadges, getCheckpoints } from "@/lib/data/game";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ ok: false }, { status: 403 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });

  const [sessions, subscribers, checkpoints, badges] = await Promise.all([
    getSessions(), getSubscriberRows(), getCheckpoints(), getBadges(),
  ]);

  // Feedback per session — one round-trip each, so fan them out rather than
  // walking the sessions serially.
  const feedback = (
    await Promise.all(
      sessions
        .filter((x) => !x.isServiceSession)
        .map(async (s) => {
          const snap = await db.collection("feedback").doc(s.id).collection("responses").get();
          if (snap.empty) return null;
          const responses = snap.docs.map((d) => ({ rating: d.data().rating as number, comment: d.data().comment as string | undefined }));
          const agg = aggregate(responses);
          return { sessionId: s.id, title: s.title, count: agg.count, average: agg.average, distribution: agg.distribution, comments: agg.comments };
        }),
    )
  ).filter((x) => x !== null);

  // Gamification: scans per checkpoint + badge distribution + top leaderboard + players.
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
  const scansCG = await db.collectionGroup("scans").get();
  scansCG.forEach((d) => { const id = d.id; scanCounts[id] = (scanCounts[id] ?? 0) + 1; });
  const lb = await db.collection("leaderboard").orderBy("points", "desc").limit(10).get();
  const leaderboard = lb.docs.map((d) => ({ displayName: d.data().displayName as string, points: d.data().points as number }));

  return NextResponse.json({
    ok: true,
    subscribers: subscribers.length,
    feedback,
    game: {
      players,
      checkpoints: checkpoints.map((c) => ({ id: c.id, name: c.name, scans: scanCounts[c.id] ?? 0 })),
      badges: badges.map((b) => ({ id: b.id, name: b.name, icon: b.icon, holders: badgeCounts[b.id] ?? 0 })),
      leaderboard,
    },
  });
}
