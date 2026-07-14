import { Hono } from "hono"
import { renderPage, TemplateError } from "@hypercube/core/render"
import {
  getResource,
  getTable,
  getView,
  listRows,
  listTables,
} from "@hypercube/core/store"
import { applyView } from "@hypercube/core/view"
import { buildMeta, entryPage, loadCube, loadPageEnv } from "../cube-render"
import type { AppEnv } from "../env"

export const publicRoutes = new Hono<AppEnv>()

publicRoutes.get("/instance", async (c) => {
  const row = await c
    .get("db")
    .selectFrom("user")
    .select("id")
    .limit(1)
    .executeTakeFirst()
  return c.json({ setup: row === undefined })
})

publicRoutes.get("/c/:cube", async (c) => {
  const ctx = await loadCube(c.get("db"), c.req.param("cube"))
  if (!ctx) return c.json({ error: "no such cube" }, 404)
  const entry = entryPage(ctx)
  const source = entry?.source ?? "# {{ cube.name }}\n"
  try {
    const meta = buildMeta(new URL(c.req.url).origin, ctx.cube, ctx.pages, entry)
    const data = await loadPageEnv(ctx.db, source)
    const accept = c.req.header("accept") ?? ""
    if (accept.includes("application/json")) {
      return c.json({
        cube: ctx.cube.uuid,
        name: ctx.cube.name,
        entry: entry?.slug ?? null,
        pages: ctx.pages.map((p) => ({ slug: p.slug, name: p.name })),
        data,
      })
    }
    return c.text(await renderPage(source, data, meta), 200, {
      "content-type": "text/markdown; charset=utf-8",
    })
  } catch (error) {
    if (error instanceof TemplateError) {
      return c.json({ error: error.message }, 422)
    }
    throw error
  }
})

publicRoutes.get("/c/:cube/:page", async (c) => {
  const ctx = await loadCube(c.get("db"), c.req.param("cube"))
  if (!ctx) return c.json({ error: "no such cube" }, 404)
  const page = ctx.pages.find((p) => p.slug === c.req.param("page"))
  if (!page) return c.json({ error: "no such page" }, 404)
  try {
    const meta = buildMeta(new URL(c.req.url).origin, ctx.cube, ctx.pages, page)
    const data = await loadPageEnv(ctx.db, page.source)
    const accept = c.req.header("accept") ?? ""
    if (accept.includes("application/json")) {
      return c.json({
        cube: ctx.cube.uuid,
        page: page.slug,
        name: page.name,
        pages: ctx.pages.map((p) => ({ slug: p.slug, name: p.name })),
        data,
      })
    }
    return c.text(await renderPage(page.source, data, meta), 200, {
      "content-type": "text/markdown; charset=utf-8",
    })
  } catch (error) {
    if (error instanceof TemplateError) {
      return c.json({ error: error.message }, 422)
    }
    throw error
  }
})

publicRoutes.get("/r/:resource", async (c) => {
  const db = c.get("db")
  const resource = await getResource(db, c.req.param("resource"))
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const tables = await listTables(db, resource.id)
  return c.json({
    resource: resource.uuid,
    name: resource.name,
    source: resource.source,
    tables: tables.map((t) => ({
      slug: t.slug,
      name: t.name,
      fields: t.fields,
      synced_at: t.synced_at,
    })),
  })
})

publicRoutes.get("/r/:resource/:table", async (c) => {
  const db = c.get("db")
  const resource = await getResource(db, c.req.param("resource"))
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const table = await getTable(db, resource.id, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  const rows = await listRows(db, table.id, 100)
  return c.json({
    resource: resource.uuid,
    table: table.slug,
    name: table.name,
    fields: table.fields,
    total: rows.length,
    rows,
  })
})

publicRoutes.get("/r/:resource/:table/views/:view", async (c) => {
  const db = c.get("db")
  const resource = await getResource(db, c.req.param("resource"))
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const table = await getTable(db, resource.id, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  const view = await getView(db, table.id, c.req.param("view"))
  if (!view) return c.json({ error: "no such view" }, 404)
  const rows = await listRows(db, table.id, 100000)
  const transformed = applyView(rows, view.config)
  return c.json({
    resource: resource.uuid,
    table: table.slug,
    view: view.slug,
    total: transformed.length,
    rows: transformed,
  })
})
