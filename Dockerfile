# syntax=docker/dockerfile:1

# ---- Stage 1: production dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Uses the lockfile when present (reproducible); falls back to npm install otherwise.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
    && npm cache clean --force

# ---- Stage 2: runtime image ----
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Run as the unprivileged user that ships with the node image.
USER node

EXPOSE 3000

# JWT_SECRET must be supplied at runtime (e.g. docker run -e JWT_SECRET=...). It is never baked in.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" || exit 1

CMD ["node", "src/server.js"]
