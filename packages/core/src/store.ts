import { sql } from "kysely"
import type { Db } from "./db"
import type { FieldType } from "./model"

// ---------------------------------------------------------------------------
// Resources: a data source (Postgres connection or built-in fields + records)
// ---------------------------------------------------------------------------

export type ResourceSource = "postgres" | "internal"

export interface ResourceField {
  name: string
  type: FieldType
  required: boolean
}

export interface ResourceRow {
  id: number
  slug: string
  name: string
  description: string | null
  source: ResourceSource
  database_url: string | null
  schema_name: string
  fields: ResourceField[]
  expose: Record<string, { pageSize?: number; label?: string } | true>
}

export interface RecordRow {
  id: number
  resource_id: number
  data: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Views: a data transform over a resource (select / filter / sort)
// ---------------------------------------------------------------------------

export type FilterOp = "eq" | "neq" | "contains" | "gt" | "lt"

export interface ViewFilter {
  field: string
  op: FilterOp
  value: string
}

export interface ViewFieldSelection {
  field: string
  label?: string
}

export interface ViewConfig {
  fields: ViewFieldSelection[]
  filters: ViewFilter[]
  sort?: { field: string; dir: "asc" | "desc" }
  pageSize?: number
}

export interface ViewRow {
  id: number
  resource_id: number
  slug: string
  name: string
  config: ViewConfig
}

// ---------------------------------------------------------------------------
// Cubes: transform engine — reference a view, render its data as agent pages
// ---------------------------------------------------------------------------

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "text"; text: string }
  | { type: "list"; ordered: boolean; item: string }
  | { type: "table"; fields: string[] }
  | { type: "fields"; fields: string[] }

export type PageTemplate =
  | { mode: "blocks"; blocks: Block[] }
  | { mode: "handlebars"; source: string }

export interface CubeRow {
  id: number
  slug: string
  name: string
  resource_id: number
  view_id: number
  /** JSONata expression: data -> data. Empty = passthrough. */
  transform: string
  /** Single Markdown page template. */
  template: PageTemplate | null
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

let ensuring: Promise<void> | null = null

export async function ensureStore(db: Db): Promise<void> {
  if (ensuring) return ensuring
  ensuring = doEnsure(db).catch((err) => {
    ensuring = null
    throw err
  })
  return ensuring
}

async function doEnsure(db: Db): Promise<void> {
  // Serialize concurrent first-run DDL across requests/processes.
  await sql`select pg_advisory_lock(4919283)`.execute(db)
  try {
    await ensureSchema(db)
  } finally {
    await sql`select pg_advisory_unlock(4919283)`.execute(db)
  }
}

async function ensureSchema(db: Db): Promise<void> {
  await sql`create schema if not exists hypercube`.execute(db)
  await sql`
    create table if not exists hypercube.resources (
      id serial primary key,
      slug text not null unique,
      name text not null,
      description text,
      source text not null default 'postgres',
      database_url text,
      schema_name text not null default 'public',
      fields jsonb not null default '[]',
      expose jsonb not null default '{}',
      created_at timestamptz not null default now()
    )
  `.execute(db)
  await sql`
    create table if not exists hypercube.records (
      id serial primary key,
      resource_id integer not null references hypercube.resources(id) on delete cascade,
      data jsonb not null default '{}',
      created_at timestamptz not null default now()
    )
  `.execute(db)
  await sql`
    create table if not exists hypercube.views (
      id serial primary key,
      resource_id integer not null references hypercube.resources(id) on delete cascade,
      slug text not null,
      name text not null,
      config jsonb not null default '{}',
      created_at timestamptz not null default now(),
      unique (resource_id, slug)
    )
  `.execute(db)
  await sql`
    create table if not exists hypercube.cubes (
      id serial primary key,
      slug text not null unique,
      name text not null,
      resource_id integer not null references hypercube.resources(id) on delete cascade,
      view_id integer not null references hypercube.views(id) on delete cascade,
      transform text not null default '',
      template jsonb,
      created_at timestamptz not null default now()
    )
  `.execute(db)
}

// ---------------------------------------------------------------------------
// Resources CRUD
// ---------------------------------------------------------------------------

const resourceColumns = [
  "id",
  "slug",
  "name",
  "description",
  "source",
  "database_url",
  "schema_name",
  "fields",
  "expose",
] as const

export async function listResources(db: Db): Promise<ResourceRow[]> {
  const rows = await db
    .selectFrom("hypercube.resources")
    .select(resourceColumns as unknown as string[])
    .orderBy("id")
    .execute()
  return rows as unknown as ResourceRow[]
}

export async function getResource(
  db: Db,
  slug: string,
): Promise<ResourceRow | null> {
  const row = await db
    .selectFrom("hypercube.resources")
    .select(resourceColumns as unknown as string[])
    .where("slug", "=", slug)
    .executeTakeFirst()
  return (row as unknown as ResourceRow | undefined) ?? null
}

export async function getResourceById(
  db: Db,
  id: number,
): Promise<ResourceRow | null> {
  const row = await db
    .selectFrom("hypercube.resources")
    .select(resourceColumns as unknown as string[])
    .where("id", "=", id)
    .executeTakeFirst()
  return (row as unknown as ResourceRow | undefined) ?? null
}

export async function createPostgresResource(
  db: Db,
  resource: {
    slug: string
    name: string
    description: string
    database_url: string
    schema_name: string
  },
): Promise<void> {
  await db
    .insertInto("hypercube.resources")
    .values({
      slug: resource.slug,
      name: resource.name,
      description: resource.description || null,
      source: "postgres",
      database_url: resource.database_url,
      schema_name: resource.schema_name || "public",
    })
    .execute()
}

export async function createInternalResource(
  db: Db,
  resource: {
    slug: string
    name: string
    description: string
    fields: ResourceField[]
  },
): Promise<void> {
  await db
    .insertInto("hypercube.resources")
    .values({
      slug: resource.slug,
      name: resource.name,
      description: resource.description || null,
      source: "internal",
      database_url: null,
      schema_name: "public",
      fields: JSON.stringify(resource.fields),
    })
    .execute()
}

export async function updateResourceMeta(
  db: Db,
  slug: string,
  meta: { name: string; description: string },
): Promise<void> {
  await db
    .updateTable("hypercube.resources")
    .set({ name: meta.name, description: meta.description || null })
    .where("slug", "=", slug)
    .execute()
}

export async function deleteResource(db: Db, slug: string): Promise<void> {
  await db
    .deleteFrom("hypercube.resources")
    .where("slug", "=", slug)
    .execute()
}

export async function updateResourceFields(
  db: Db,
  slug: string,
  fields: ResourceField[],
): Promise<void> {
  await db
    .updateTable("hypercube.resources")
    .set({ fields: JSON.stringify(fields) })
    .where("slug", "=", slug)
    .execute()
}

export async function addField(
  db: Db,
  slug: string,
  field: ResourceField,
): Promise<void> {
  const resource = await getResource(db, slug)
  if (!resource) throw new Error("no such resource")
  if (resource.fields.some((f) => f.name === field.name)) {
    throw new Error("field already exists")
  }
  await updateResourceFields(db, slug, [...resource.fields, field])
}

export async function updateField(
  db: Db,
  slug: string,
  original: string,
  field: ResourceField,
): Promise<void> {
  const resource = await getResource(db, slug)
  if (!resource) throw new Error("no such resource")
  const fields = resource.fields.map((f) => (f.name === original ? field : f))
  await updateResourceFields(db, slug, fields)
  if (original !== field.name) {
    await sql`
      update hypercube.records
      set data = (data - ${original}::text)
        || jsonb_build_object(${field.name}::text, data -> ${original}::text)
      where resource_id = ${resource.id} and data ? ${original}::text
    `.execute(db)
  }
}

export async function deleteField(
  db: Db,
  slug: string,
  name: string,
): Promise<void> {
  const resource = await getResource(db, slug)
  if (!resource) throw new Error("no such resource")
  await updateResourceFields(
    db,
    slug,
    resource.fields.filter((f) => f.name !== name),
  )
  await sql`
    update hypercube.records set data = data - ${name}
    where resource_id = ${resource.id}
  `.execute(db)
}

// ---------------------------------------------------------------------------
// Records CRUD (records belong to a resource)
// ---------------------------------------------------------------------------

export async function listRecords(
  db: Db,
  resourceId: number,
  opts: { limit: number; offset: number },
): Promise<{ rows: RecordRow[]; total: number }> {
  const rows = await db
    .selectFrom("hypercube.records")
    .select(["id", "resource_id", "data", "created_at"])
    .where("resource_id", "=", resourceId)
    .orderBy("id")
    .limit(opts.limit)
    .offset(opts.offset)
    .execute()
  const counted = await db
    .selectFrom("hypercube.records")
    .select(sql<number>`count(*)::int`.as("n"))
    .where("resource_id", "=", resourceId)
    .executeTakeFirst()
  return { rows: rows as unknown as RecordRow[], total: counted?.n ?? 0 }
}

export async function getRecord(
  db: Db,
  resourceId: number,
  id: number,
): Promise<RecordRow | null> {
  const row = await db
    .selectFrom("hypercube.records")
    .select(["id", "resource_id", "data", "created_at"])
    .where("resource_id", "=", resourceId)
    .where("id", "=", id)
    .executeTakeFirst()
  return (row as unknown as RecordRow | undefined) ?? null
}

export async function insertRecord(
  db: Db,
  resourceId: number,
  data: Record<string, unknown>,
): Promise<void> {
  await db
    .insertInto("hypercube.records")
    .values({ resource_id: resourceId, data: JSON.stringify(data) })
    .execute()
}

export async function updateRecord(
  db: Db,
  resourceId: number,
  id: number,
  data: Record<string, unknown>,
): Promise<void> {
  await db
    .updateTable("hypercube.records")
    .set({ data: JSON.stringify(data) })
    .where("resource_id", "=", resourceId)
    .where("id", "=", id)
    .execute()
}

export async function deleteRecord(
  db: Db,
  resourceId: number,
  id: number,
): Promise<void> {
  await db
    .deleteFrom("hypercube.records")
    .where("resource_id", "=", resourceId)
    .where("id", "=", id)
    .execute()
}

// ---------------------------------------------------------------------------
// Views CRUD (views belong to a resource)
// ---------------------------------------------------------------------------

const viewColumns = ["id", "resource_id", "slug", "name", "config"] as const

export async function listViews(
  db: Db,
  resourceId: number,
): Promise<ViewRow[]> {
  const rows = await db
    .selectFrom("hypercube.views")
    .select(viewColumns as unknown as string[])
    .where("resource_id", "=", resourceId)
    .orderBy("id")
    .execute()
  return rows as unknown as ViewRow[]
}

export async function getView(
  db: Db,
  resourceId: number,
  slug: string,
): Promise<ViewRow | null> {
  const row = await db
    .selectFrom("hypercube.views")
    .select(viewColumns as unknown as string[])
    .where("resource_id", "=", resourceId)
    .where("slug", "=", slug)
    .executeTakeFirst()
  return (row as unknown as ViewRow | undefined) ?? null
}

export async function getViewById(
  db: Db,
  id: number,
): Promise<ViewRow | null> {
  const row = await db
    .selectFrom("hypercube.views")
    .select(viewColumns as unknown as string[])
    .where("id", "=", id)
    .executeTakeFirst()
  return (row as unknown as ViewRow | undefined) ?? null
}

export async function createView(
  db: Db,
  view: {
    resourceId: number
    slug: string
    name: string
    config: ViewConfig
  },
): Promise<void> {
  await db
    .insertInto("hypercube.views")
    .values({
      resource_id: view.resourceId,
      slug: view.slug,
      name: view.name,
      config: JSON.stringify(view.config),
    })
    .execute()
}

export async function updateView(
  db: Db,
  resourceId: number,
  slug: string,
  patch: { name: string; config: ViewConfig },
): Promise<void> {
  await db
    .updateTable("hypercube.views")
    .set({ name: patch.name, config: JSON.stringify(patch.config) })
    .where("resource_id", "=", resourceId)
    .where("slug", "=", slug)
    .execute()
}

export async function deleteView(
  db: Db,
  resourceId: number,
  slug: string,
): Promise<void> {
  await db
    .deleteFrom("hypercube.views")
    .where("resource_id", "=", resourceId)
    .where("slug", "=", slug)
    .execute()
}

// ---------------------------------------------------------------------------
// Cubes CRUD (a cube references a view and holds page templates)
// ---------------------------------------------------------------------------

const cubeColumns = [
  "id",
  "slug",
  "name",
  "resource_id",
  "view_id",
  "transform",
  "template",
] as const

export async function listCubes(db: Db): Promise<CubeRow[]> {
  const rows = await db
    .selectFrom("hypercube.cubes")
    .select(cubeColumns as unknown as string[])
    .orderBy("id")
    .execute()
  return rows as unknown as CubeRow[]
}

export async function getCube(db: Db, slug: string): Promise<CubeRow | null> {
  const row = await db
    .selectFrom("hypercube.cubes")
    .select(cubeColumns as unknown as string[])
    .where("slug", "=", slug)
    .executeTakeFirst()
  return (row as unknown as CubeRow | undefined) ?? null
}

export async function createCube(
  db: Db,
  cube: {
    slug: string
    name: string
    resourceId: number
    viewId: number
    transform: string
    template: PageTemplate | null
  },
): Promise<void> {
  await db
    .insertInto("hypercube.cubes")
    .values({
      slug: cube.slug,
      name: cube.name,
      resource_id: cube.resourceId,
      view_id: cube.viewId,
      transform: cube.transform,
      template: cube.template ? JSON.stringify(cube.template) : null,
    })
    .execute()
}

export async function updateCube(
  db: Db,
  slug: string,
  patch: {
    name?: string
    viewId?: number
    transform?: string
    template?: PageTemplate | null
  },
): Promise<void> {
  const set: Record<string, unknown> = {}
  if (patch.name !== undefined) set.name = patch.name
  if (patch.viewId !== undefined) set.view_id = patch.viewId
  if (patch.transform !== undefined) set.transform = patch.transform
  if (patch.template !== undefined)
    set.template = patch.template ? JSON.stringify(patch.template) : null
  if (Object.keys(set).length === 0) return
  await db
    .updateTable("hypercube.cubes")
    .set(set)
    .where("slug", "=", slug)
    .execute()
}

export async function deleteCube(db: Db, slug: string): Promise<void> {
  await db.deleteFrom("hypercube.cubes").where("slug", "=", slug).execute()
}
