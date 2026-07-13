FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY apps/console/package.json apps/console/
RUN pnpm install --frozen-lockfile --filter console --filter @hypercube/core
COPY packages/core packages/core
COPY apps/console apps/console
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV BETTER_AUTH_SECRET=build-placeholder
RUN pnpm --filter console build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /app/apps/console/.next/standalone ./
COPY --from=build /app/apps/console/.next/static ./apps/console/.next/static
COPY --from=build /app/apps/console/public ./apps/console/public
USER node
EXPOSE 3000
CMD ["node", "apps/console/server.js"]
