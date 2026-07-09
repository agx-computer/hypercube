# Hypercube

Hypercube is a context transform engine. It connects to any data source and
turns it into an interface agents and applications can use.

The current milestone: connect a Postgres database, choose what to expose,
and get a generated REST API.

## Run

```bash
pnpm install
pnpm dev
```

Set `DATABASE_URL` (the instance database) and `BETTER_AUTH_SECRET` in
`apps/console/.env.local`. The first visit creates the admin account.

## API

- `GET /api/c/:slug` the cube: exposed entities, fields, relations
- `GET /api/c/:slug/:entity?page=1&pageSize=25` rows, policy filtered
- `GET /api/c/:slug/:entity/:key` one row

## Layout

- `packages/core` the engine: schema model, policy, Postgres introspection,
  query runtime, instance store
- `apps/console` the product: Next.js console (better-auth, shadcn/ui) and
  the generated API

## Later

The agent surface (pages as navigable Markdown), more connectors, write
endpoints, API tokens, the schema builder.
