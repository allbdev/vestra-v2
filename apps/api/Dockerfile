# syntax=docker/dockerfile:1.7
# Multi-stage build for @vestra/api in a pnpm monorepo.

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.28.2
ARG PRISMA_VERSION=7.3.0

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

# Copy lockfile + workspace manifests first (better layer cache)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy sources
COPY apps/api apps/api
COPY packages packages

# Build + prune to prod deps in /out
RUN pnpm --filter @vestra/api build \
 && pnpm --filter @vestra/api --prod deploy /out

# ---------- runner ----------
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache openssl libc6-compat tini
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

# Prisma CLI in runtime — used by Fly release_command for `migrate deploy`.
# Pinned to match @prisma/client major. ~80MB; acceptable.
ARG PRISMA_VERSION
RUN npm i -g prisma@${PRISMA_VERSION}

COPY --from=builder /out/package.json ./
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/prisma ./prisma
COPY --from=builder /repo/apps/api/prisma.config.ts ./prisma.config.ts

EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
