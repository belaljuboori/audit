# Multi-stage build: compile TypeScript, then run on a minimal, non-root runtime image.

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Used only by the one-shot db-migrate job in docker-compose (`prisma migrate
# deploy` + seed) — retains devDependencies (the Prisma CLI) which the
# slimmed-down runtime image below deliberately does not carry.
FROM build AS migrator
WORKDIR /app
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Non-root application user — the container never runs as root.
RUN groupadd --gid 10001 soc && useradd --uid 10001 --gid soc --shell /usr/sbin/nologin --no-create-home soc

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

USER soc
EXPOSE 3000
CMD ["node", "dist/main.js"]
