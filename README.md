<p align="center">
  <img src="assets/banner-logo.png" alt="Hypercube" />
</p>

Hypercube is a context transform engine. It connects to any data source and
turns it into navigable markdown pages for agents.

## Run

With Docker, Postgres included:

```bash
BETTER_AUTH_SECRET=$(openssl rand -base64 32) docker compose up -d
```

Or from source:

```bash
pnpm install
pnpm dev
```

Set `DATABASE_URL` (the application database) and `BETTER_AUTH_SECRET` in
`apps/console/.env.local` — an empty database is fine, migrations run on
boot. Sign up at `/signup`; the first account becomes the admin.

## API

- `GET /c/:cube` the cube's entry page
- `GET /c/:cube/:page` a specific page of the cube

## Layout

- `packages/core` the engine: schema model, Postgres introspection, query
  runtime, instance store, JIM
- `apps/console` the product: Next.js console (better-auth, shadcn/ui) and
  the generated API
- `apps/docs` the documentation site (Fumadocs): what Hypercube is and how
  to self-host
- `specs/jim.md` the page format: JIM, JavaScript in Markdown

## Later

More connectors, write endpoints, API tokens, the schema builder.
