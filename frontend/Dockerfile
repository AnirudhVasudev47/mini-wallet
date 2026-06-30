# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Backend API URL baked into the Next.js client bundle at build time
ENV NEXT_PUBLIC_API_URL=https://mini-wallet-api-883639585183.asia-south1.run.app/api/v1

# Install dependencies first (better Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the Next.js app in standalone mode
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Copy the standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Cloud Run sets PORT automatically
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
EXPOSE 8080

CMD ["node", "server.js"]
