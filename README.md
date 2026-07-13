<p align="center">
  <img src="assets/banner-logo.png" alt="Hypercube" />
</p>

Hypercube is a context transform engine. It connects to any data source and
turns it into navigable markdown pages for agents.

## Run

```bash
pnpm install
pnpm dev
```

Set `DATABASE_URL` (the instance database) and `BETTER_AUTH_SECRET` in
`apps/console/.env.local`. The first visit creates the admin account.

## API

> [!NOTE]
> Responses are Markdown.

- `GET /c/:cube` the cube's entry page
- `GET /c/:cube/:page` a specific page of the cube

## Layout

- `packages/core` the engine: schema model, Postgres introspection, query
  runtime, instance store, JIM
- `apps/console` the product: Next.js console (better-auth, shadcn/ui) and
  the generated API
- `apps/docs` the documentation site (Fumadocs): what Hypercube is and how
  to self-host
- `specs/jim.md` the page format: JIM, JS in Markdown

## Later

More connectors, write endpoints, API tokens, the schema builder.
