# syntax=docker/dockerfile:1.7
# Multi-stage build for @vestra/api in a pnpm monorepo.

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.28.2

# ---------- base ----------
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache openssl libc6-compat
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# ---------- builder ----------
FROM base AS builder
WORKDIR /repo

# Build-time placeholder. apps/api/postinstall runs `prisma generate`,
# which loads prisma.config.ts → eager env("DATABASE_URL"). Real URL
# is provided at runtime by Fly secrets.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

# Workspace manifest + lockfile + sources up front so postinstall
# (prisma generate) sees the schema. pnpm store stays cached across
# builds via the cache mount, so re-installs are still fast.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api apps/api
COPY packages packages

# Install only api + its transitive workspace deps (skips dashboard/marketing/ui).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @vestra/api...

# Build + prune to prod deps in /out.
# --legacy because pnpm 10 dropped non-injected workspace deploy by default
# (would otherwise need `inject-workspace-packages=true` in workspace config).
RUN pnpm --filter @vestra/api build \
 && pnpm --filter @vestra/api --prod --legacy deploy /out

# ---------- runner ----------
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache openssl libc6-compat tini
ENV NODE_ENV=production
ENV PORT=3001
# Make local node_modules/.bin first on PATH so `prisma migrate deploy`
# in fly.toml release_command resolves to /app/node_modules/.bin/prisma.
ENV PATH=/app/node_modules/.bin:$PATH
WORKDIR /app

COPY --from=builder /out/package.json ./
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/prisma ./prisma
COPY --from=builder /repo/apps/api/prisma.config.ts ./prisma.config.ts

EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
