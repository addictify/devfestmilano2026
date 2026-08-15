# Production image for the Next.js server build (ISR, route handlers and image
# optimization all intact). Debian slim rather than Alpine: the image optimizer
# pulls in sharp, whose prebuilt binaries are glibc-based.
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
# `packageManager` in package.json pins the pnpm version corepack activates.
RUN corepack enable
WORKDIR /app

# ---- dependencies -----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build ------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# have to be present here, not just at runtime. They are public by definition
# (they ship in the browser JS). Server-only secrets — FIREBASE_ADMIN_*,
# REVALIDATE_SECRET, CRON_SECRET — are deliberately NOT build args: they are
# injected at runtime, so they never end up in an image layer. Without them the
# build prerenders against bundled seed content, and ISR refreshes from
# Firestore once the container is running.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TICKETS_URL
ARG NEXT_PUBLIC_CFP_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    STANDALONE=1
RUN pnpm build

# ---- runtime ----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `standalone` emits a server plus only the traced node_modules; `public` and
# `.next/static` are not included automatically and must be copied alongside it.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
# Default when the image is run directly; Compose overrides PORT so that the
# container listens on exactly the port it publishes (see docker-compose.yaml).
EXPOSE 3000

# Node 24 ships fetch globally, so this needs no extra packages in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
