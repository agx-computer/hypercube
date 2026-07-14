<p align="center">
  <img src="assets/banner-logo.png" alt="Hypercube" />
</p>

Hypercube is a context transform engine. It connects to any data source and
turns it into navigable markdown pages for agents.

- Demo: https://demo.hypercube.sh (email: `admin@example.com`, password: `admin1234`)
- Docs: https://docs.hypercube.sh

## Run

```bash
pnpm install
pnpm dev:server
pnpm dev
```

The API runs on Cloudflare Workers (`apps/server`). Copy
`apps/server/.dev.vars.example` to `apps/server/.dev.vars` and set
`DATABASE_URL` (the application database) and `BETTER_AUTH_SECRET` — an empty
database is fine, migrations run on boot. The console (`apps/console`) reads
`NEXT_PUBLIC_API_URL` from `apps/console/.env.local` (defaults to
`https://api.hypercube.sh`). Sign up at `/signup`; the first account becomes
the admin.

## API

- `GET /c/:cube` the cube's entry page
- `GET /c/:cube/:page` a specific page of the cube

## Layout

- `packages/core` the engine: schema model, Postgres introspection, query
  runtime, instance store, JIM
- `apps/server` the API: Hono on Cloudflare Workers (better-auth, resource
  endpoints, the public cube pages)
- `apps/console` the console: Next.js static UI (TanStack Query, shadcn/ui)
- `apps/docs` the documentation site (Fumadocs): what Hypercube is and how
  to self-host
- `specs/jim.md` the page format: JIM, JavaScript in Markdown

## Later

More connectors, the schema builder.
