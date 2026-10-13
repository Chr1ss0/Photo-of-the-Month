# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- Build
FROM docker.io/library/node:22-bookworm-slim AS build
# Fallback-Toolchain, falls für sharp/better-sqlite3 kein vorkompiliertes Paket existiert
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Abhängigkeiten zuerst (besseres Layer-Caching)
COPY backend/package.json backend/package-lock.json backend/
COPY frontend/package.json frontend/package-lock.json frontend/
RUN npm ci --prefix backend && npm ci --prefix frontend

COPY backend backend
COPY frontend frontend
RUN npm run build --prefix frontend \
 && npm run build --prefix backend \
 && npm prune --omit=dev --prefix backend

# ---------------------------------------------------------------- Runtime
FROM docker.io/library/node:22-bookworm-slim AS runtime
# Git-Commit des Builds (von deploy/update.sh gesetzt) – sichtbar per `docker inspect`
ARG GIT_COMMIT=unknown
LABEL org.opencontainers.image.title="Photo of the Month" \
      org.opencontainers.image.revision=$GIT_COMMIT
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data \
    COOKIE_SECURE=true \
    TRUST_PROXY=1
WORKDIR /app/backend

COPY --from=build --chown=node:node /app/backend/package.json ./package.json
COPY --from=build --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --from=build --chown=node:node /app/frontend/dist /app/frontend/dist

# Datenbank und Bilder liegen im Volume /data
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
