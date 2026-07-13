"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
  addField,
  createCube,
  createInternalResource,
  createPage,
  createPostgresResource,
  createTable,
  createView,
  deleteCube,
  deleteField,
  deletePage,
  deleteRecord,
  deleteResource,
  deleteTable,
  deleteTablesExcept,
  deleteView,
  ensureStore,
  getCube,
  getResource,
  getTable,
  getView,
  insertRecord,
  listPages,
  replaceRecords,
  updateCube,
  updateField,
  updatePage,
  updateRecord,
  updateResourceConnection,
  updateResourceName,
  updateTableName,
  updateView,
  upsertSyncedTable,
} from "@hypercube/core/store"
import type {
  ResourceRow,
  TableField,
  TableRow,
  ViewConfig,
} from "@hypercube/core/store"
import { compileJim, renderPage, TemplateError } from "@hypercube/core"
import type { Db, FieldType } from "@hypercube/core"
import { createRuntime, introspect } from "@hypercube/core/postgres"
import { buildMeta, loadPageEnv } from "./cube-render"
import { instanceDb, targetDb } from "./db"
import { originFromHeaders } from "./origin"
import { requireSession } from "./session"

const FIELD_TYPES: FieldType[] = ["text", "number", "boolean", "date"]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export async function createInternalResourceAction(
  formData: FormData,
): Promise<void> {
  await requireSession()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("resource name required")
  const db = instanceDb()
  await ensureStore(db)
  const created = await createInternalResource(db, { name })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/resources/${created.uuid}`)
}

export async function createPostgresResourceAction(
  formData: FormData,
): Promise<void> {
  await requireSession()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("resource name required")
  const db = instanceDb()
  await ensureStore(db)
  const created = await createPostgresResource(db, {
    name,
    database_url: String(formData.get("database_url") ?? "").trim(),
    schema_name: String(formData.get("schema_name") ?? "").trim() || "public",
  })
  const resource = await getResource(db, created.uuid)
  if (resource) {
    try {
      await syncPostgresResource(db, resource)
    } catch {}
  }
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/resources/${created.uuid}`)
}

export async function updateResourceAction(
  resourceId: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await updateResourceName(
    db,
    resourceId,
    String(formData.get("name") ?? "").trim(),
  )
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/resources/${resourceId}`)
}

export async function updateResourceConnectionAction(
  resourceId: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceId)
  if (!resource || resource.source !== "postgres") {
    throw new Error("no such resource")
  }
  await updateResourceConnection(db, resourceId, {
    database_url: String(formData.get("database_url") ?? "").trim(),
    schema_name: String(formData.get("schema_name") ?? "").trim() || "public",
  })
  const updated = await getResource(db, resourceId)
  if (updated) {
    try {
      await syncPostgresResource(db, updated)
    } catch {}
  }
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/resources/${resourceId}`)
}

export async function deleteResourceAction(resourceId: string): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await deleteResource(db, resourceId)
  revalidatePath("/dashboard", "layout")
  redirect("/dashboard")
}

// ---------------------------------------------------------------------------
// Sync (postgres resources: table schemas plus the first rows, cached)
// ---------------------------------------------------------------------------

const SYNC_ROWS = 20

async function syncPostgresResource(
  db: Db,
  resource: ResourceRow,
): Promise<number> {
  const target = targetDb(resource.database_url ?? "")
  try {
    const model = await introspect(target, resource.schema_name)
    const runtime = createRuntime(target, resource.schema_name, model)
    const slugs: string[] = []
    for (const entity of model.entities) {
      const fields: TableField[] = entity.fields.map((f) => ({
        name: f.name,
        type: f.type,
        required: !f.nullable,
      }))
      const tableId = await upsertSyncedTable(db, {
        resourceId: resource.id,
        slug: entity.name,
        name: entity.name,
        fields,
      })
      const { rows } = await runtime.list({
        entity: entity.name,
        page: 1,
        pageSize: SYNC_ROWS,
      })
      await replaceRecords(db, tableId, rows)
      slugs.push(entity.name)
    }
    await deleteTablesExcept(db, resource.id, slugs)
    return slugs.length
  } finally {
    await target.destroy()
  }
}

export async function syncResourceAction(
  resourceId: string,
): Promise<{ error: string } | { tables: number }> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceId)
  if (!resource || resource.source !== "postgres") {
    return { error: "no such resource" }
  }
  try {
    const tables = await syncPostgresResource(db, resource)
    revalidatePath("/dashboard", "layout")
    return { tables }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

// ---------------------------------------------------------------------------
// Tables (on a resource)
// ---------------------------------------------------------------------------

async function requireTable(
  db: Db,
  resourceId: string,
  tableSlug: string,
): Promise<{ resource: ResourceRow; table: TableRow }> {
  const resource = await getResource(db, resourceId)
  if (!resource) throw new Error("no such resource")
  const table = await getTable(db, resource.id, tableSlug)
  if (!table) throw new Error("no such table")
  return { resource, table }
}

export async function createTableAction(
  resourceId: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceId)
  if (!resource) throw new Error("no such resource")
  if (resource.source !== "internal") {
    throw new Error("tables of a connected database come from Sync")
  }
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("table name required")
  const slug = slugify(name)
  if (!slug) throw new Error("invalid table name")
  await createTable(db, { resourceId: resource.id, slug, name, fields: [] })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/resources/${resourceId}/tables/${slug}`)
}

export async function updateTableMetaAction(
  resourceId: string,
  tableSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const { resource } = await requireTable(db, resourceId, tableSlug)
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("table name required")
  await updateTableName(db, resource.id, tableSlug, name)
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
}

export async function deleteTableAction(
  resourceId: string,
  tableSlug: string,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceId)
  if (!resource) throw new Error("no such resource")
  await deleteTable(db, resource.id, tableSlug)
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/resources/${resourceId}`)
}

// ---------------------------------------------------------------------------
// Fields (on a table)
// ---------------------------------------------------------------------------

function fieldFromForm(formData: FormData): TableField {
  const name = String(formData.get("name") ?? "").trim()
  const rawType = String(formData.get("type") ?? "text")
  const type = FIELD_TYPES.includes(rawType as FieldType)
    ? (rawType as FieldType)
    : "text"
  return { name, type, required: formData.get("required") !== null }
}

export async function addFieldAction(
  resourceId: string,
  tableSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const field = fieldFromForm(formData)
  if (!field.name) throw new Error("field name required")
  const db = instanceDb()
  await ensureStore(db)
  const { table } = await requireTable(db, resourceId, tableSlug)
  await addField(db, table.id, field)
  revalidatePath(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
}

export async function updateFieldAction(
  resourceId: string,
  tableSlug: string,
  original: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const field = fieldFromForm(formData)
  if (!field.name) throw new Error("field name required")
  const db = instanceDb()
  await ensureStore(db)
  const { table } = await requireTable(db, resourceId, tableSlug)
  await updateField(db, table.id, original, field)
  revalidatePath(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
}

export async function deleteFieldAction(
  resourceId: string,
  tableSlug: string,
  name: string,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const { table } = await requireTable(db, resourceId, tableSlug)
  await deleteField(db, table.id, name)
  revalidatePath(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
}

// ---------------------------------------------------------------------------
// Records (on a table)
// ---------------------------------------------------------------------------

function coerce(type: FieldType, raw: string): unknown {
  if (raw === "") return null
  if (type === "number") return Number(raw)
  return raw
}

async function readData(
  resourceId: string,
  tableSlug: string,
  formData: FormData,
) {
  const db = instanceDb()
  await ensureStore(db)
  const { table } = await requireTable(db, resourceId, tableSlug)
  const data: Record<string, unknown> = {}
  for (const field of table.fields) {
    if (field.type === "boolean") {
      data[field.name] = formData.get(field.name) !== null
    } else {
      data[field.name] = coerce(
        field.type,
        String(formData.get(field.name) ?? ""),
      )
    }
  }
  return { db, table, data }
}

export async function createRecordAction(
  resourceId: string,
  tableSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const { db, table, data } = await readData(resourceId, tableSlug, formData)
  await insertRecord(db, table.id, data)
  revalidatePath(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
}

export async function updateRecordAction(
  resourceId: string,
  tableSlug: string,
  recordId: number,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const { db, table, data } = await readData(resourceId, tableSlug, formData)
  await updateRecord(db, table.id, recordId, data)
  revalidatePath(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
}

export async function deleteRecordAction(
  resourceId: string,
  tableSlug: string,
  recordId: number,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const { table } = await requireTable(db, resourceId, tableSlug)
  await deleteRecord(db, table.id, recordId)
  revalidatePath(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
}

// ---------------------------------------------------------------------------
// Views (on a table — transform only)
// ---------------------------------------------------------------------------

export async function createViewAction(
  resourceId: string,
  tableSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const { table } = await requireTable(db, resourceId, tableSlug)
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("view name required")
  const slug = slugify(name)
  if (!slug) throw new Error("invalid view name")
  const config: ViewConfig = {
    fields: table.fields.map((f) => ({ field: f.name })),
    filters: [],
    pageSize: 25,
  }
  await createView(db, { tableId: table.id, slug, name, config })
  revalidatePath(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
  redirect(
    `/dashboard/resources/${resourceId}/tables/${tableSlug}/views/${slug}`,
  )
}

export async function saveViewAction(
  resourceId: string,
  tableSlug: string,
  viewSlug: string,
  config: ViewConfig,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const { table } = await requireTable(db, resourceId, tableSlug)
  const view = await getView(db, table.id, viewSlug)
  if (!view) throw new Error("no such view")
  await updateView(db, table.id, viewSlug, { name: view.name, config })
  revalidatePath(
    `/dashboard/resources/${resourceId}/tables/${tableSlug}/views/${viewSlug}`,
  )
}

export async function deleteViewAction(
  resourceId: string,
  tableSlug: string,
  viewSlug: string,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const { table } = await requireTable(db, resourceId, tableSlug)
  await deleteView(db, table.id, viewSlug)
  revalidatePath(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
  redirect(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
}

// ---------------------------------------------------------------------------
// Cubes (a set of Markdown pages, one of them the entry)
// ---------------------------------------------------------------------------

const STARTER_SOURCE = [
  "# {{ cube.name }}",
  "",
  "## Pages",
  "",
  '{{ pages.length ? pages.map(p => `- [${p.name}](${p.url})`).join("\\n") : "_No pages._" }}',
  "",
].join("\n")

export async function createCubeAction(formData: FormData): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("cube name required")
  const cube = await createCube(db, { name })
  const pageId = await createPage(db, {
    cubeId: cube.id,
    slug: "index",
    name: "Index",
    source: STARTER_SOURCE,
  })
  await updateCube(db, cube.uuid, { entryPageId: pageId })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/cubes/${cube.uuid}`)
}

export async function updateCubeAction(
  cubeId: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("cube name required")
  await updateCube(db, cubeId, { name })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/cubes/${cubeId}`)
}

export async function deleteCubeAction(cubeId: string): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await deleteCube(db, cubeId)
  revalidatePath("/dashboard", "layout")
  redirect("/dashboard")
}

// ---------------------------------------------------------------------------
// Pages (on a cube)
// ---------------------------------------------------------------------------

function validateSource(source: string): string | null {
  try {
    compileJim(source)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

export async function createPageAction(
  cubeId: string,
  input: { name: string; source: string },
): Promise<{ error: string } | void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeId)
  if (!cube) throw new Error("no such cube")
  const name = input.name.trim()
  if (!name) throw new Error("page name required")
  const slug = slugify(name)
  if (!slug) throw new Error("invalid page name")
  const invalid = validateSource(input.source)
  if (invalid) return { error: invalid }
  const pageId = await createPage(db, {
    cubeId: cube.id,
    slug,
    name,
    source: input.source,
  })
  if (cube.entry_page_id == null) {
    await updateCube(db, cubeId, { entryPageId: pageId })
  }
  revalidatePath(`/dashboard/cubes/${cubeId}`)
  redirect(`/dashboard/cubes/${cubeId}/pages/${slug}`)
}

export async function updatePageMetaAction(
  cubeId: string,
  pageSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeId)
  if (!cube) throw new Error("no such cube")
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("page name required")
  await updatePage(db, cube.id, pageSlug, { name })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/cubes/${cubeId}/pages/${pageSlug}`)
}

export async function savePageAction(
  cubeId: string,
  pageSlug: string,
  patch: { source: string },
): Promise<{ error: string } | void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeId)
  if (!cube) throw new Error("no such cube")
  const invalid = validateSource(patch.source)
  if (invalid) return { error: invalid }
  await updatePage(db, cube.id, pageSlug, { source: patch.source })
  revalidatePath(`/dashboard/cubes/${cubeId}/pages/${pageSlug}`)
}

export async function previewPageAction(
  cubeId: string,
  pageSlug: string,
  draft: { source: string },
): Promise<{ markdown: string } | { error: string }> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeId)
  if (!cube) return { error: "no such cube" }
  const pages = await listPages(db, cube.id)
  const page = pages.find((p) => p.slug === pageSlug) ?? null
  try {
    const data = await loadPageEnv(db, draft.source)
    const origin = originFromHeaders(await headers())
    const meta = buildMeta(origin, cube, pages, page)
    return { markdown: renderPage(draft.source, data, meta) }
  } catch (error) {
    if (error instanceof TemplateError) return { error: error.message }
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deletePageAction(
  cubeId: string,
  pageSlug: string,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeId)
  if (!cube) throw new Error("no such cube")
  await deletePage(db, cube.id, pageSlug)
  revalidatePath(`/dashboard/cubes/${cubeId}`)
  redirect(`/dashboard/cubes/${cubeId}`)
}
