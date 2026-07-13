<p align="center">
  <img src="assets/banner-logo.png" alt="Hypercube" />
</p>

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

- `GET /c/:cube` the cube's entry page as Markdown; JSON with
  `Accept: application/json`
- `GET /c/:cube/:page` a specific page of the cube
- `GET /api/r/:resource` a resource's rows
- `GET /api/r/:resource/views/:view` rows through a view

## Layout

- `packages/core` the engine: schema model, policy, Postgres introspection,
  query runtime, instance store
- `apps/console` the product: Next.js console (better-auth, shadcn/ui) and
  the generated API
- `specs/jim.md` the page format: JIM, JS in Markdown

## Later

More connectors, write endpoints, API tokens, the schema builder.
