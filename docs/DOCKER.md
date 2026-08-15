# Running the site with Docker

Two ways to start the site. Both read configuration from `.env` in the repo
root (Compose picks it up automatically) — copy `.env.example` first if you
don't have one.

```bash
docker compose up --build        # production server on http://localhost:3100
```

That's it. `--build` is only needed the first time, or after changing
dependencies or any `NEXT_PUBLIC_*` value (see the caveat below).

| Command | What it does |
| --- | --- |
| `docker compose up --build` | Build + run the production server (port 3100) |
| `docker compose up -d` | Same, detached |
| `docker compose logs -f web` | Follow logs |
| `docker compose down` | Stop and remove the container |
| `docker compose --profile dev up dev` | Hot-reload dev container (port 3101) |

Override ports with `WEB_PORT` / `DEV_PORT` in `.env` (defaults 3100 / 3101).

## Which one should I use?

**For day-to-day development, prefer plain `pnpm dev` over the `dev`
container.** Next's own docs recommend it: on macOS and Windows the
bind-mounted source is noticeably slower, and the first `docker compose
--profile dev up dev` has to install all ~675 packages into a container volume
before it serves anything (a few minutes). After that first install the volume
persists, so later starts are quick.

The `web` service is the one that matters: it's the real production build, and
it's what you want for verifying a release, reproducing a deploy-only bug, or
running the site somewhere that isn't Vercel.

## How configuration reaches the app

Two different mechanisms, and the distinction matters:

- **`NEXT_PUBLIC_*` — baked in at build time.** Next inlines these into the
  client-side JavaScript bundle during `next build`, so they're passed as
  Docker build args (Compose fills them in from `.env`). They are public by
  definition; they ship in the browser. **Changing one requires a rebuild**
  (`docker compose up --build`) — restarting the container is not enough.
- **Server-only secrets — injected at runtime.** `FIREBASE_ADMIN_*`,
  `REVALIDATE_SECRET` and `CRON_SECRET` are passed via `env_file: .env` when
  the container starts, never as build args. They are therefore never written
  into an image layer, so the image is safe to push to a registry. Changing one
  only needs a restart.

`.env` itself is excluded from the build context by `.dockerignore` and is
never copied into the image.

## Behaviour without Firebase

The image builds and runs fine with no Firebase credentials at all. The data
layer falls back to the bundled seed content, so every page still renders; the
API routes that need the Admin SDK answer `503` instead of failing. This is
also what happens during the Docker build itself: pages are prerendered against
seed content, and ISR refreshes them from Firestore once the container is up
with real credentials.

## Notes

- The image uses Next's `standalone` output (enabled by `STANDALONE=1`, set
  only inside the Dockerfile) so it ships just the traced dependencies —
  roughly 310 MB, and the Vercel build is unaffected.
- It runs as the non-root `node` user and has a healthcheck, so
  `docker compose ps` reports real health rather than just "running".
- Debian slim rather than Alpine, because the image optimizer's `sharp`
  binaries are glibc-based.
