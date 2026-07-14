import { createMiddleware } from "hono/factory"
import type { AppEnv } from "./env"

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header("x-api-key")
  if (key) {
    const result = await c.get("auth").api.verifyApiKey({ body: { key } })
    if (!result.valid) return c.json({ error: "unauthorized" }, 401)
    await next()
    return
  }
  const session = await c
    .get("auth")
    .api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: "unauthorized" }, 401)
  c.set("session", session)
  await next()
})

export const requireApiKey = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header("x-api-key")
  if (!key) return c.json({ error: "missing x-api-key header" }, 401)
  const result = await c.get("auth").api.verifyApiKey({ body: { key } })
  if (!result.valid) return c.json({ error: "unauthorized" }, 401)
  await next()
})
