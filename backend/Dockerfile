# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Re-generate Prisma client in production node_modules
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist/

# Cloud Run sets PORT automatically
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
