import { Hono } from "hono"
import { cors } from "hono/cors"
import { ensureStore } from "@hypercube/core/store"
import { createAuth } from "./auth"
import { openDb } from "./db"
import type { AppEnv } from "./env"
import { requireSession } from "./session"
import { cubes } from "./routes/cubes"
import { publicRoutes } from "./routes/public"
import { resources } from "./routes/resources"

const app = new Hono<AppEnv>()

app.use("*", (c, next) =>
  cors({
    origin: (origin) => (origin === c.env.CONSOLE_ORIGIN ? origin : null),
    credentials: true,
  })(c, next),
)

app.use("*", async (c, next) => {
  const db = openDb(c.env)
  c.set("db", db)
  c.set("auth", createAuth(c.env, db))
  await ensureStore(db)
  try {
    await next()
  } finally {
    c.executionCtx.waitUntil(db.destroy())
  }
})

app.get("/", (c) => c.json({ name: "hypercube api" }))

app.on(["GET", "POST"], "/auth/*", (c) => c.get("auth").handler(c.req.raw))

app.use("/cubes", requireSession)
app.use("/cubes/*", requireSession)
app.use("/resources", requireSession)
app.use("/resources/*", requireSession)

app.route("/cubes", cubes)
app.route("/resources", resources)
app.route("/", publicRoutes)

app.notFound((c) => c.json({ error: "not found" }, 404))

app.onError((err, c) => {
  console.error("unhandled", err)
  return c.json(
    { error: err instanceof Error ? err.message : String(err) },
    500,
  )
})

export default app
