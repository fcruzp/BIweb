# ============================================
# DataMind BI - Production Dockerfile (Debian-based)
# ============================================
# Switched from Alpine to Debian to fix better-sqlite3
# "fcntl64: symbol not found" error caused by musl libc incompatibility.
# Debian uses glibc which is stable and backward-compatible.
# ============================================

# ---- Stage 1: Install dependencies ----
FROM node:22-slim AS deps

# Build tools for native addons (better-sqlite3, sharp) + OpenSSL for Prisma
RUN apt-get update && apt-get install -y python3 make g++ openssl && rm -rf /var/lib/apt/lists/*

# Copy Bun binary from official image
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Stage 2: Build the application ----
FROM node:22-slim AS builder

# OpenSSL needed for Prisma Client at build time
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy Bun binary from official image (needed for bun commands)
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time ARGs for Next.js public env vars (embedded in client bundle)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Use "bun x" instead of "bunx" (bunx is a separate symlink not copied with the binary)
RUN bun x prisma generate
RUN bun run build

# Remove .env from standalone output — env vars come from Coolify at runtime
RUN rm -f .next/standalone/.env

# Remove user data dirs from standalone output — they should be mounted as volumes
RUN rm -rf .next/standalone/data .next/standalone/upload .next/standalone/download

# ---- Stage 3: Production runner ----
FROM node:22-slim AS runner
WORKDIR /app

# Runtime libraries required by native addons:
# - openssl (libssl3): Prisma query engine needs libssl.so.3 + libcrypto.so.3
# - libstdc++6: better-sqlite3 native addon needs libstdc++.so.6
RUN apt-get update && apt-get install -y openssl libstdc++6 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# DATA_DIR: Override the data directory for SQLite files.
# In production, set this to a persistent volume mount path (e.g., /app/data).
# If not set, defaults to {cwd}/data which is /app/data in the container.
ENV DATA_DIR=/app/data

RUN groupadd --system --gid 1001 nodejs && \
useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create data directories and set ownership
RUN mkdir -p /app/data /app/upload /app/download && chown -R nextjs:nodejs /app/data /app/upload /app/download

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
