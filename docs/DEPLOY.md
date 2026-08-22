# Deploying to Firebase

The site is a server-rendered Next.js app: route handlers under `src/app/api`,
the i18n proxy, ISR, `/admin`, and DevFest Quest all need a server. On Firebase
that means **App Hosting** (which runs on Cloud Run), not classic Hosting.

## Prerequisite: the Blaze plan

App Hosting can't be enabled on the free Spark plan — `firebase
apphosting:backends:create` refuses with "must be on the Blaze (pay-as-you-go)
plan". Upgrade at:

    https://console.firebase.google.com/project/devfestmilano26/usage/details

Blaze is usage-based and keeps Spark's free tiers, so a site this size normally
costs very little — but it is a real billing account, and `minInstances: 0` in
`apphosting.yaml` is what keeps it idling at zero. Set a budget alert while
you're in the console.

## One-time setup

```bash
# 1. Create the backend and connect it to the GitHub repo.
firebase apphosting:backends:create --project devfestmilano26

# 2. Upload the server-only secrets to Cloud Secret Manager.
#    Values come from your local .env — never commit them.
firebase apphosting:secrets:set firebase-admin-client-email
firebase apphosting:secrets:set firebase-admin-private-key
firebase apphosting:secrets:set revalidate-secret
firebase apphosting:secrets:set cron-secret
firebase apphosting:secrets:set sessionize-event-id

# 3. Let the backend read them.
firebase apphosting:secrets:grantaccess firebase-admin-client-email --backend <backend-id>
#    …repeat for each secret.
```

`apphosting.yaml` already declares which variables are public (inlined at BUILD,
because `NEXT_PUBLIC_*` ends up in the client bundle) and which are RUNTIME-only
secrets. After setup, every push to the connected branch builds and rolls out.

## After the first deploy

- Add the live domain to **Console → Authentication → Settings → Authorized
  domains**, or Google sign-in fails there. `2026.devfestmilano.it` is already
  authorized; a `*.web.app` or preview URL is not.
- Point `NEXT_PUBLIC_SITE_URL` at the real origin if it changes — it drives
  canonical URLs, the sitemap and OG tags.

## The hourly Sessionize sync

`/api/sync` pulls speakers/sessions/tracks from Sessionize and writes them to
Firestore. It used to be triggered by a `vercel.json` cron, which App Hosting has
no equivalent for, so schedule it with Cloud Scheduler (also Blaze-only):

```bash
gcloud scheduler jobs create http devfest-sessionize-sync \
  --project devfestmilano26 \
  --location europe-west1 \
  --schedule "0 * * * *" \
  --uri "https://<your-app-hosting-domain>/api/sync" \
  --http-method GET \
  --headers "Authorization=Bearer $CRON_SECRET"
```

The route accepts either `Authorization: Bearer $CRON_SECRET` or
`?secret=$REVALIDATE_SECRET`, and returns 503 while Firebase Admin is
unconfigured, so it fails safe rather than half-writing.

## Firestore rules

Deployed separately, and independently of the hosting plan:

```bash
firebase deploy --only firestore:rules
```

`.firebaserc` pins the project, so no `--project` flag is needed. Do this after
any edit to `firebase/firestore.rules` — the rules are what stop anonymous
clients reading `subscribers`, `checkpoints` and `gameProfiles` with the public
web API key.

## The Spark-plan fallback

`pnpm build:static` (see `scripts/static-build.sh`) produces a static export for
GitHub Pages. It temporarily removes the API routes, `/admin` and the proxy,
because none of them can work without a server. That's a genuinely reduced site:
no ticket-interest capture, no login, no My Schedule sync, no admin, no DevFest
Quest, no feedback. Fine as a placeholder, not as the event-day site.
