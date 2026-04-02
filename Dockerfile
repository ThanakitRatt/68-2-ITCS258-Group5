# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for layer-cache efficiency
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy source and Prisma schema
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Prisma schema is needed at runtime for migrations
COPY prisma ./prisma

EXPOSE 3000

CMD ["sh", "-c", "node prisma/seed.js && node dist/main"]
