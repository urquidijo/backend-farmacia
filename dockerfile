# --- Build stage ---
FROM node:20-slim AS build
WORKDIR /app

# Instala cliente de Postgres SOLO en runtime (no aquí)
# Dependencias para build
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:20-slim AS runtime
WORKDIR /app

# Cliente de Postgres para pg_dump/pg_restore/psql
RUN apt-get update && apt-get install -y --no-install-recommends \
  postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Railway inyecta PORT; Nest debe escucharlo
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
