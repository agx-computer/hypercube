import { Hono } from "hono"
import {
  addField,
  createInternalResource,
  createPostgresResource,
  createTable,
  createView,
  deleteField,
  deleteRecord,
  deleteResource,
  deleteTable,
  deleteView,
  getResource,
  getTable,
  getView,
  insertRecord,
  listRecords,
  listResources,
  listRows,
  listTables,
  listViews,
  updateField,
  updateRecord,
  updateResourceConnection,
  updateResourceName,
  updateTableName,
  updateView,
} from "@hypercube/core/store"
import type {
  ResourceRow,
  TableField,
  TableRow,
  ViewConfig,
} from "@hypercube/core/store"
import type { Db, FieldType } from "@hypercube/core"
import type { Context } from "hono"
import type { AppEnv } from "../env"
import { FIELD_TYPES, recordData, slugify, syncPostgresResource } from "../lib"

export const resources = new Hono<AppEnv>()

async function requireResource(
  c: Context<AppEnv>,
): Promise<ResourceRow | null> {
  return getResource(c.get("db"), c.req.param("resourceId") ?? "")
}

async function requireTable(
  db: Db,
  resource: ResourceRow,
  slug: string,
): Promise<TableRow | null> {
  return getTable(db, resource.id, slug)
}

function fieldFrom(body: Record<string, unknown>): TableField | null {
  const name = String(body.name ?? "").trim()
  if (!name) return null
  const rawType = String(body.type ?? "text")
  const type = FIELD_TYPES.includes(rawType as FieldType)
    ? (rawType as FieldType)
    : "text"
  return { name, type, required: Boolean(body.required) }
}

resources.get("/", async (c) => {
  const db = c.get("db")
  const withSample = c.req.query("sample") === "1"
  const resourceRows = await listResources(db)
  const payload = await Promise.all(
    resourceRows.map(async (r) => ({
      uuid: r.uuid,
      name: r.name,
      source: r.source,
      tables: await Promise.all(
        (await listTables(db, r.id)).map(async (t) => ({
          slug: t.slug,
          name: t.name,
          fields: t.fields,
          synced_at: t.synced_at,
          ...(withSample
            ? { sample: (await listRows(db, t.id, 1))[0] ?? null }
            : {}),
        })),
      ),
    })),
  )
  return c.json(payload)
})

resources.post("/", async (c) => {
  const body = await c.req.json<{
    name?: string
    source?: string
    database_url?: string
    schema_name?: string
  }>()
  const name = String(body.name ?? "").trim()
  if (!name) return c.json({ error: "resource name required" }, 400)
  const db = c.get("db")
  if (body.source === "postgres") {
    const created = await createPostgresResource(db, {
      name,
      database_url: String(body.database_url ?? "").trim(),
      schema_name: String(body.schema_name ?? "").trim() || "public",
    })
    return c.json({ uuid: created.uuid }, 201)
  }
  const created = await createInternalResource(db, { name })
  return c.json({ uuid: created.uuid }, 201)
})

resources.get("/:resourceId", async (c) => {
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const tables = await listTables(c.get("db"), resource.id)
  return c.json({
    uuid: resource.uuid,
    name: resource.name,
    source: resource.source,
    database_url: resource.database_url,
    schema_name: resource.schema_name,
    tables: tables.map((t) => ({
      slug: t.slug,
      name: t.name,
      fields: t.fields,
      synced_at: t.synced_at,
    })),
  })
})

resources.patch("/:resourceId", async (c) => {
  const body = await c.req.json<{
    name?: string
    database_url?: string
    schema_name?: string
  }>()
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  if (body.database_url !== undefined) {
    if (resource.source !== "postgres") {
      return c.json({ error: "no such resource" }, 404)
    }
    await updateResourceConnection(db, resource.uuid, {
      database_url: String(body.database_url).trim(),
      schema_name: String(body.schema_name ?? "").trim() || "public",
    })
    const updated = await getResource(db, resource.uuid)
    if (updated) {
      try {
        await syncPostgresResource(db, updated)
      } catch {}
    }
    return c.json({ ok: true })
  }
  const name = String(body.name ?? "").trim()
  if (!name) return c.json({ error: "resource name required" }, 400)
  await updateResourceName(db, resource.uuid, name)
  return c.json({ ok: true })
})

resources.delete("/:resourceId", async (c) => {
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  await deleteResource(c.get("db"), resource.uuid)
  return c.json({ ok: true })
})

resources.post("/:resourceId/sync", async (c) => {
  const resource = await requireResource(c)
  if (!resource || resource.source !== "postgres") {
    return c.json({ error: "no such resource" }, 404)
  }
  try {
    const tables = await syncPostgresResource(c.get("db"), resource)
    return c.json({ tables })
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : String(error) },
      422,
    )
  }
})

resources.post("/:resourceId/tables", async (c) => {
  const body = await c.req.json<{ name?: string }>()
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  if (resource.source !== "internal") {
    return c.json({ error: "tables of a connected database come from Sync" }, 400)
  }
  const name = String(body.name ?? "").trim()
  if (!name) return c.json({ error: "table name required" }, 400)
  const slug = slugify(name)
  if (!slug) return c.json({ error: "invalid table name" }, 400)
  await createTable(c.get("db"), {
    resourceId: resource.id,
    slug,
    name,
    fields: [],
  })
  return c.json({ slug }, 201)
})

resources.get("/:resourceId/tables/:table", async (c) => {
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  const limit = Math.min(Number(c.req.query("limit") ?? 100) || 100, 1000)
  const offset = Math.max(Number(c.req.query("offset") ?? 0) || 0, 0)
  const [views, records] = await Promise.all([
    listViews(db, table.id),
    listRecords(db, table.id, { limit, offset }),
  ])
  return c.json({
    slug: table.slug,
    name: table.name,
    fields: table.fields,
    synced_at: table.synced_at,
    views: views.map((v) => ({ slug: v.slug, name: v.name })),
    records: {
      rows: records.rows.map((r) => ({ id: r.id, data: r.data })),
      total: records.total,
    },
  })
})

resources.patch("/:resourceId/tables/:table", async (c) => {
  const body = await c.req.json<{ name?: string }>()
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  const name = String(body.name ?? "").trim()
  if (!name) return c.json({ error: "table name required" }, 400)
  await updateTableName(db, resource.id, table.slug, name)
  return c.json({ ok: true })
})

resources.delete("/:resourceId/tables/:table", async (c) => {
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  await deleteTable(c.get("db"), resource.id, c.req.param("table"))
  return c.json({ ok: true })
})

resources.post("/:resourceId/tables/:table/fields", async (c) => {
  const body = await c.req.json<Record<string, unknown>>()
  const field = fieldFrom(body)
  if (!field) return c.json({ error: "field name required" }, 400)
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  await addField(db, table.id, field)
  return c.json({ ok: true }, 201)
})

resources.patch("/:resourceId/tables/:table/fields/:field", async (c) => {
  const body = await c.req.json<Record<string, unknown>>()
  const field = fieldFrom(body)
  if (!field) return c.json({ error: "field name required" }, 400)
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  await updateField(db, table.id, c.req.param("field"), field)
  return c.json({ ok: true })
})

resources.delete("/:resourceId/tables/:table/fields/:field", async (c) => {
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  await deleteField(db, table.id, c.req.param("field"))
  return c.json({ ok: true })
})

resources.post("/:resourceId/tables/:table/records", async (c) => {
  const body = await c.req.json<{ values?: Record<string, unknown> }>()
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  await insertRecord(db, table.id, recordData(table.fields, body.values ?? {}))
  return c.json({ ok: true }, 201)
})

resources.patch("/:resourceId/tables/:table/records/:recordId", async (c) => {
  const body = await c.req.json<{ values?: Record<string, unknown> }>()
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  await updateRecord(
    db,
    table.id,
    Number(c.req.param("recordId")),
    recordData(table.fields, body.values ?? {}),
  )
  return c.json({ ok: true })
})

resources.delete("/:resourceId/tables/:table/records/:recordId", async (c) => {
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  await deleteRecord(db, table.id, Number(c.req.param("recordId")))
  return c.json({ ok: true })
})

resources.post("/:resourceId/tables/:table/views", async (c) => {
  const body = await c.req.json<{ name?: string }>()
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  const name = String(body.name ?? "").trim()
  if (!name) return c.json({ error: "view name required" }, 400)
  const slug = slugify(name)
  if (!slug) return c.json({ error: "invalid view name" }, 400)
  const config: ViewConfig = {
    fields: table.fields.map((f) => ({ field: f.name })),
    filters: [],
    pageSize: 25,
  }
  await createView(db, { tableId: table.id, slug, name, config })
  return c.json({ slug }, 201)
})

resources.get("/:resourceId/tables/:table/views/:view", async (c) => {
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  const [view, rows] = await Promise.all([
    getView(db, table.id, c.req.param("view")),
    listRows(db, table.id, 1000),
  ])
  if (!view) return c.json({ error: "no such view" }, 404)
  return c.json({
    slug: view.slug,
    name: view.name,
    config: view.config,
    rows,
  })
})

resources.patch("/:resourceId/tables/:table/views/:view", async (c) => {
  const body = await c.req.json<{ config?: ViewConfig }>()
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  const view = await getView(db, table.id, c.req.param("view"))
  if (!view) return c.json({ error: "no such view" }, 404)
  if (!body.config) return c.json({ error: "view config required" }, 400)
  await updateView(db, table.id, view.slug, {
    name: view.name,
    config: body.config,
  })
  return c.json({ ok: true })
})

resources.delete("/:resourceId/tables/:table/views/:view", async (c) => {
  const resource = await requireResource(c)
  if (!resource) return c.json({ error: "no such resource" }, 404)
  const db = c.get("db")
  const table = await requireTable(db, resource, c.req.param("table"))
  if (!table) return c.json({ error: "no such table" }, 404)
  await deleteView(db, table.id, c.req.param("view"))
  return c.json({ ok: true })
})
