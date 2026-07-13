import { sql } from "kysely"
import type { Db } from "./db"
import type { FieldType } from "./model"

// ---------------------------------------------------------------------------
// Resources: a data source (Postgres connection or built-in tables)
// ---------------------------------------------------------------------------

export type ResourceSource = "postgres" | "internal"

export interface ResourceRow {
  id: number
  uuid: string
  name: string
  source: ResourceSource
  database_url: string | null
  schema_name: string
}

// ---------------------------------------------------------------------------
// Tables: a named collection of fields and records inside a resource
// ---------------------------------------------------------------------------

export interface TableField {
  name: string
  type: FieldType
  required: boolean
}

export interface TableRow {
  id: number
  resource_id: number
  slug: string
  name: string
  fields: TableField[]
  synced_at: string | null
}

export interface RecordRow {
  id: number
  table_id: number
  data: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Views: a data transform over a table (select / filter / sort)
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
  table_id: number
  slug: string
  name: string
  config: ViewConfig
}

// ---------------------------------------------------------------------------
// Cubes: a set of Markdown pages, one of them the entry page
// ---------------------------------------------------------------------------

export interface CubeRow {
  id: number
  uuid: string
  name: string
  entry_page_id: number | null
}

export interface PageRow {
  id: number
  cube_id: number
  slug: string
  name: string
  /** A JIM document: optional JS frontmatter plus a Markdown body. */
  source: string
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
  // Serialize concurrent first-run DDL across requests/processes. The lock
  // is transaction-scoped so the store stays safe behind poolers running
  // in transaction mode.
  await db.transaction().execute(async (trx) => {
    await sql`select pg_advisory_xact_lock(4919283)`.execute(trx)
    await ensureSchema(trx)
  })
}

async function ensureSchema(db: Db): Promise<void> {
  await ensureAuthSchema(db)
  await sql`create schema if not exists hypercube`.execute(db)
  await sql`
    create table if not exists hypercube.resources (
      id serial primary key,
      uuid uuid not null unique default gen_random_uuid(),
      name text not null,
      source text not null default 'postgres',
      database_url text,
      schema_name text not null default 'public',
      created_at timestamptz not null default now()
    )
  `.execute(db)
  await sql`
    delete from hypercube.resources where source = 'api'
  `.execute(db)
  await sql`
    alter table hypercube.resources
      add column if not exists uuid uuid not null unique default gen_random_uuid(),
      drop column if exists slug,
      drop column if exists url,
      drop column if exists items_path,
      drop column if exists description
  `.execute(db)
  await sql`
    create table if not exists hypercube.tables (
      id serial primary key,
      resource_id integer not null references hypercube.resources(id) on delete cascade,
      slug text not null,
      name text not null,
      fields jsonb not null default '[]',
      synced_at timestamptz,
      created_at timestamptz not null default now(),
      unique (resource_id, slug)
    )
  `.execute(db)
  await sql`
    create table if not exists hypercube.records (
      id serial primary key,
      table_id integer not null references hypercube.tables(id) on delete cascade,
      data jsonb not null default '{}',
      created_at timestamptz not null default now()
    )
  `.execute(db)
  await sql`
    alter table hypercube.records
      add column if not exists table_id integer references hypercube.tables(id) on delete cascade
  `.execute(db)
  await sql`
    create table if not exists hypercube.views (
      id serial primary key,
      table_id integer not null references hypercube.tables(id) on delete cascade,
      slug text not null,
      name text not null,
      config jsonb not null default '{}',
      created_at timestamptz not null default now(),
      unique (table_id, slug)
    )
  `.execute(db)
  await sql`
    alter table hypercube.views
      add column if not exists table_id integer references hypercube.tables(id) on delete cascade
  `.execute(db)
  await sql`
    do $$
    begin
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'hypercube'
          and table_name = 'resources' and column_name = 'fields'
      ) then
        insert into hypercube.tables (resource_id, slug, name, fields)
          select r.id,
            coalesce(
              nullif(
                trim(both '-' from regexp_replace(lower(r.name), '[^a-z0-9]+', '-', 'g')),
                ''
              ),
              'table-' || r.id
            ),
            r.name,
            r.fields
          from hypercube.resources r
          where r.source = 'internal'
            and not exists (
              select 1 from hypercube.tables t where t.resource_id = r.id
            );
        alter table hypercube.resources drop column fields;
      end if;
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'hypercube'
          and table_name = 'resources' and column_name = 'expose'
      ) then
        alter table hypercube.resources drop column expose;
      end if;
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'hypercube'
          and table_name = 'records' and column_name = 'resource_id'
      ) then
        update hypercube.records rec set table_id = t.id
          from hypercube.tables t
          where rec.table_id is null and t.resource_id = rec.resource_id;
        delete from hypercube.records where table_id is null;
        alter table hypercube.records alter column table_id set not null;
        alter table hypercube.records drop column resource_id;
      end if;
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'hypercube'
          and table_name = 'views' and column_name = 'resource_id'
      ) then
        update hypercube.views v set table_id = t.id
          from hypercube.tables t
          where v.table_id is null and t.resource_id = v.resource_id;
        delete from hypercube.views where table_id is null;
        alter table hypercube.views alter column table_id set not null;
        alter table hypercube.views drop column resource_id;
      end if;
    end $$
  `.execute(db)
  await sql`
    create unique index if not exists views_table_id_slug_key
      on hypercube.views (table_id, slug)
  `.execute(db)
  await sql`
    create table if not exists hypercube.cubes (
      id serial primary key,
      uuid uuid not null unique default gen_random_uuid(),
      name text not null,
      created_at timestamptz not null default now()
    )
  `.execute(db)
  await sql`
    create table if not exists hypercube.pages (
      id serial primary key,
      cube_id integer not null references hypercube.cubes(id) on delete cascade,
      slug text not null,
      name text not null,
      source text not null default '',
      created_at timestamptz not null default now(),
      unique (cube_id, slug)
    )
  `.execute(db)
  await sql`
    alter table hypercube.cubes
      add column if not exists entry_page_id integer
        references hypercube.pages(id) on delete set null
  `.execute(db)
  await sql`
    alter table hypercube.pages
      add column if not exists source text not null default '',
      drop column if exists template,
      drop column if exists bindings,
      drop column if exists blocks,
      drop column if exists variables
  `.execute(db)
  await sql`
    alter table hypercube.cubes
      add column if not exists uuid uuid not null unique default gen_random_uuid(),
      drop column if exists slug,
      drop column if exists template,
      drop column if exists resource_id,
      drop column if exists view_id,
      drop column if exists transform
  `.execute(db)
}

// ---------------------------------------------------------------------------
// Auth tables (the better-auth schema, generated by its CLI)
// ---------------------------------------------------------------------------

async function ensureAuthSchema(db: Db): Promise<void> {
  await sql`
    create table if not exists "user" (
      "id" text not null primary key,
      "name" text not null,
      "email" text not null unique,
      "emailVerified" boolean not null,
      "image" text,
      "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
      "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
    )
  `.execute(db)
  await sql`
    create table if not exists "session" (
      "id" text not null primary key,
      "expiresAt" timestamptz not null,
      "token" text not null unique,
      "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
      "updatedAt" timestamptz not null,
      "ipAddress" text,
      "userAgent" text,
      "userId" text not null references "user" ("id") on delete cascade
    )
  `.execute(db)
  await sql`
    create table if not exists "account" (
      "id" text not null primary key,
      "accountId" text not null,
      "providerId" text not null,
      "userId" text not null references "user" ("id") on delete cascade,
      "accessToken" text,
      "refreshToken" text,
      "idToken" text,
      "accessTokenExpiresAt" timestamptz,
      "refreshTokenExpiresAt" timestamptz,
      "scope" text,
      "password" text,
      "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
      "updatedAt" timestamptz not null
    )
  `.execute(db)
  await sql`
    create table if not exists "verification" (
      "id" text not null primary key,
      "identifier" text not null,
      "value" text not null,
      "expiresAt" timestamptz not null,
      "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
      "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
    )
  `.execute(db)
  await sql`
    create index if not exists "session_userId_idx" on "session" ("userId")
  `.execute(db)
  await sql`
    create index if not exists "account_userId_idx" on "account" ("userId")
  `.execute(db)
  await sql`
    create index if not exists "verification_identifier_idx" on "verification" ("identifier")
  `.execute(db)
}

// ---------------------------------------------------------------------------
// Resources CRUD
// ---------------------------------------------------------------------------

const resourceColumns = [
  "id",
  "uuid",
  "name",
  "source",
  "database_url",
  "schema_name",
] as const

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  uuid: string,
): Promise<ResourceRow | null> {
  if (!UUID_PATTERN.test(uuid)) return null
  const row = await db
    .selectFrom("hypercube.resources")
    .select(resourceColumns as unknown as string[])
    .where("uuid", "=", uuid)
    .executeTakeFirst()
  return (row as unknown as ResourceRow | undefined) ?? null
}

export async function createPostgresResource(
  db: Db,
  resource: {
    name: string
    database_url: string
    schema_name: string
  },
): Promise<{ id: number; uuid: string }> {
  const row = await db
    .insertInto("hypercube.resources")
    .values({
      name: resource.name,
      source: "postgres",
      database_url: resource.database_url,
      schema_name: resource.schema_name || "public",
    })
    .returning(["id", "uuid"])
    .executeTakeFirstOrThrow()
  const created = row as { id: number; uuid: string }
  return { id: Number(created.id), uuid: created.uuid }
}

export async function createInternalResource(
  db: Db,
  resource: { name: string },
): Promise<{ id: number; uuid: string }> {
  const row = await db
    .insertInto("hypercube.resources")
    .values({
      name: resource.name,
      source: "internal",
      database_url: null,
      schema_name: "public",
    })
    .returning(["id", "uuid"])
    .executeTakeFirstOrThrow()
  const created = row as { id: number; uuid: string }
  return { id: Number(created.id), uuid: created.uuid }
}

export async function updateResourceName(
  db: Db,
  uuid: string,
  name: string,
): Promise<void> {
  await db
    .updateTable("hypercube.resources")
    .set({ name })
    .where("uuid", "=", uuid)
    .execute()
}

export async function updateResourceConnection(
  db: Db,
  uuid: string,
  patch: { database_url: string; schema_name: string },
): Promise<void> {
  await db
    .updateTable("hypercube.resources")
    .set({
      database_url: patch.database_url,
      schema_name: patch.schema_name,
    })
    .where("uuid", "=", uuid)
    .execute()
}

export async function deleteResource(db: Db, uuid: string): Promise<void> {
  await db
    .deleteFrom("hypercube.resources")
    .where("uuid", "=", uuid)
    .execute()
}

// ---------------------------------------------------------------------------
// Tables CRUD (tables belong to a resource)
// ---------------------------------------------------------------------------

const tableColumns = [
  "id",
  "resource_id",
  "slug",
  "name",
  "fields",
  "synced_at",
] as const

export async function listAllTables(
  db: Db,
): Promise<{ resource_id: number; slug: string; name: string }[]> {
  const rows = await db
    .selectFrom("hypercube.tables")
    .select(["resource_id", "slug", "name"])
    .orderBy("id")
    .execute()
  return rows as unknown as { resource_id: number; slug: string; name: string }[]
}

export async function listTables(
  db: Db,
  resourceId: number,
): Promise<TableRow[]> {
  const rows = await db
    .selectFrom("hypercube.tables")
    .select(tableColumns as unknown as string[])
    .where("resource_id", "=", resourceId)
    .orderBy("id")
    .execute()
  return rows as unknown as TableRow[]
}

export async function getTable(
  db: Db,
  resourceId: number,
  slug: string,
): Promise<TableRow | null> {
  const row = await db
    .selectFrom("hypercube.tables")
    .select(tableColumns as unknown as string[])
    .where("resource_id", "=", resourceId)
    .where("slug", "=", slug)
    .executeTakeFirst()
  return (row as unknown as TableRow | undefined) ?? null
}

export async function getTableById(
  db: Db,
  id: number,
): Promise<TableRow | null> {
  const row = await db
    .selectFrom("hypercube.tables")
    .select(tableColumns as unknown as string[])
    .where("id", "=", id)
    .executeTakeFirst()
  return (row as unknown as TableRow | undefined) ?? null
}

export async function createTable(
  db: Db,
  table: {
    resourceId: number
    slug: string
    name: string
    fields: TableField[]
  },
): Promise<number> {
  const row = await db
    .insertInto("hypercube.tables")
    .values({
      resource_id: table.resourceId,
      slug: table.slug,
      name: table.name,
      fields: JSON.stringify(table.fields),
    })
    .returning("id")
    .executeTakeFirstOrThrow()
  return Number((row as { id: number }).id)
}

export async function updateTableName(
  db: Db,
  resourceId: number,
  slug: string,
  name: string,
): Promise<void> {
  await db
    .updateTable("hypercube.tables")
    .set({ name })
    .where("resource_id", "=", resourceId)
    .where("slug", "=", slug)
    .execute()
}

export async function deleteTable(
  db: Db,
  resourceId: number,
  slug: string,
): Promise<void> {
  await db
    .deleteFrom("hypercube.tables")
    .where("resource_id", "=", resourceId)
    .where("slug", "=", slug)
    .execute()
}

/** Upsert a table from a schema sync; stamps synced_at. Returns the id. */
export async function upsertSyncedTable(
  db: Db,
  table: {
    resourceId: number
    slug: string
    name: string
    fields: TableField[]
  },
): Promise<number> {
  const row = await db
    .insertInto("hypercube.tables")
    .values({
      resource_id: table.resourceId,
      slug: table.slug,
      name: table.name,
      fields: JSON.stringify(table.fields),
      synced_at: sql`now()`,
    })
    .onConflict((oc) =>
      oc.columns(["resource_id", "slug"]).doUpdateSet({
        name: table.name,
        fields: JSON.stringify(table.fields),
        synced_at: sql`now()`,
      }),
    )
    .returning("id")
    .executeTakeFirstOrThrow()
  return Number((row as { id: number }).id)
}

export async function deleteTablesExcept(
  db: Db,
  resourceId: number,
  keep: string[],
): Promise<void> {
  let query = db
    .deleteFrom("hypercube.tables")
    .where("resource_id", "=", resourceId)
  if (keep.length > 0) query = query.where("slug", "not in", keep)
  await query.execute()
}

// ---------------------------------------------------------------------------
// Fields (on a table)
// ---------------------------------------------------------------------------

async function setTableFields(
  db: Db,
  tableId: number,
  fields: TableField[],
): Promise<void> {
  await db
    .updateTable("hypercube.tables")
    .set({ fields: JSON.stringify(fields) })
    .where("id", "=", tableId)
    .execute()
}

export async function addField(
  db: Db,
  tableId: number,
  field: TableField,
): Promise<void> {
  const table = await getTableById(db, tableId)
  if (!table) throw new Error("no such table")
  if (table.fields.some((f) => f.name === field.name)) {
    throw new Error("field already exists")
  }
  await setTableFields(db, tableId, [...table.fields, field])
}

export async function updateField(
  db: Db,
  tableId: number,
  original: string,
  field: TableField,
): Promise<void> {
  const table = await getTableById(db, tableId)
  if (!table) throw new Error("no such table")
  const fields = table.fields.map((f) => (f.name === original ? field : f))
  await setTableFields(db, tableId, fields)
  if (original !== field.name) {
    await sql`
      update hypercube.records
      set data = (data - ${original}::text)
        || jsonb_build_object(${field.name}::text, data -> ${original}::text)
      where table_id = ${tableId} and data ? ${original}::text
    `.execute(db)
  }
}

export async function deleteField(
  db: Db,
  tableId: number,
  name: string,
): Promise<void> {
  const table = await getTableById(db, tableId)
  if (!table) throw new Error("no such table")
  await setTableFields(
    db,
    tableId,
    table.fields.filter((f) => f.name !== name),
  )
  await sql`
    update hypercube.records set data = data - ${name}
    where table_id = ${tableId}
  `.execute(db)
}

// ---------------------------------------------------------------------------
// Records CRUD (records belong to a table)
// ---------------------------------------------------------------------------

export async function listRecords(
  db: Db,
  tableId: number,
  opts: { limit: number; offset: number },
): Promise<{ rows: RecordRow[]; total: number }> {
  const rows = await db
    .selectFrom("hypercube.records")
    .select(["id", "table_id", "data", "created_at"])
    .where("table_id", "=", tableId)
    .orderBy("id")
    .limit(opts.limit)
    .offset(opts.offset)
    .execute()
  const counted = await db
    .selectFrom("hypercube.records")
    .select(sql<number>`count(*)::int`.as("n"))
    .where("table_id", "=", tableId)
    .executeTakeFirst()
  return { rows: rows as unknown as RecordRow[], total: counted?.n ?? 0 }
}

/** A table's records as flat rows ({ id, ...data }). */
export async function listRows(
  db: Db,
  tableId: number,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const { rows } = await listRecords(db, tableId, { limit, offset: 0 })
  return rows.map((r) => ({ id: r.id, ...r.data }))
}

export async function insertRecord(
  db: Db,
  tableId: number,
  data: Record<string, unknown>,
): Promise<void> {
  await db
    .insertInto("hypercube.records")
    .values({ table_id: tableId, data: JSON.stringify(data) })
    .execute()
}

export async function updateRecord(
  db: Db,
  tableId: number,
  id: number,
  data: Record<string, unknown>,
): Promise<void> {
  await db
    .updateTable("hypercube.records")
    .set({ data: JSON.stringify(data) })
    .where("table_id", "=", tableId)
    .where("id", "=", id)
    .execute()
}

export async function deleteRecord(
  db: Db,
  tableId: number,
  id: number,
): Promise<void> {
  await db
    .deleteFrom("hypercube.records")
    .where("table_id", "=", tableId)
    .where("id", "=", id)
    .execute()
}

/** Replace a table's records wholesale (used by schema syncs). */
export async function replaceRecords(
  db: Db,
  tableId: number,
  rows: Record<string, unknown>[],
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom("hypercube.records")
      .where("table_id", "=", tableId)
      .execute()
    if (rows.length === 0) return
    await trx
      .insertInto("hypercube.records")
      .values(
        rows.map((data) => ({
          table_id: tableId,
          data: JSON.stringify(data),
        })),
      )
      .execute()
  })
}

// ---------------------------------------------------------------------------
// Views CRUD (views belong to a table)
// ---------------------------------------------------------------------------

const viewColumns = ["id", "table_id", "slug", "name", "config"] as const

export async function listViews(db: Db, tableId: number): Promise<ViewRow[]> {
  const rows = await db
    .selectFrom("hypercube.views")
    .select(viewColumns as unknown as string[])
    .where("table_id", "=", tableId)
    .orderBy("id")
    .execute()
  return rows as unknown as ViewRow[]
}

export async function getView(
  db: Db,
  tableId: number,
  slug: string,
): Promise<ViewRow | null> {
  const row = await db
    .selectFrom("hypercube.views")
    .select(viewColumns as unknown as string[])
    .where("table_id", "=", tableId)
    .where("slug", "=", slug)
    .executeTakeFirst()
  return (row as unknown as ViewRow | undefined) ?? null
}

export async function createView(
  db: Db,
  view: {
    tableId: number
    slug: string
    name: string
    config: ViewConfig
  },
): Promise<void> {
  await db
    .insertInto("hypercube.views")
    .values({
      table_id: view.tableId,
      slug: view.slug,
      name: view.name,
      config: JSON.stringify(view.config),
    })
    .execute()
}

export async function updateView(
  db: Db,
  tableId: number,
  slug: string,
  patch: { name: string; config: ViewConfig },
): Promise<void> {
  await db
    .updateTable("hypercube.views")
    .set({ name: patch.name, config: JSON.stringify(patch.config) })
    .where("table_id", "=", tableId)
    .where("slug", "=", slug)
    .execute()
}

export async function deleteView(
  db: Db,
  tableId: number,
  slug: string,
): Promise<void> {
  await db
    .deleteFrom("hypercube.views")
    .where("table_id", "=", tableId)
    .where("slug", "=", slug)
    .execute()
}

// ---------------------------------------------------------------------------
// Cubes CRUD (a cube holds pages; one of them is the entry)
// ---------------------------------------------------------------------------

const cubeColumns = ["id", "uuid", "name", "entry_page_id"] as const

export async function listCubes(db: Db): Promise<CubeRow[]> {
  const rows = await db
    .selectFrom("hypercube.cubes")
    .select(cubeColumns as unknown as string[])
    .orderBy("id")
    .execute()
  return rows as unknown as CubeRow[]
}

export async function getCube(db: Db, uuid: string): Promise<CubeRow | null> {
  if (!UUID_PATTERN.test(uuid)) return null
  const row = await db
    .selectFrom("hypercube.cubes")
    .select(cubeColumns as unknown as string[])
    .where("uuid", "=", uuid)
    .executeTakeFirst()
  return (row as unknown as CubeRow | undefined) ?? null
}

export async function createCube(
  db: Db,
  cube: { name: string },
): Promise<{ id: number; uuid: string }> {
  const row = await db
    .insertInto("hypercube.cubes")
    .values({ name: cube.name })
    .returning(["id", "uuid"])
    .executeTakeFirstOrThrow()
  const created = row as { id: number; uuid: string }
  return { id: Number(created.id), uuid: created.uuid }
}

export async function updateCube(
  db: Db,
  uuid: string,
  patch: { name?: string; entryPageId?: number | null },
): Promise<void> {
  const set: Record<string, unknown> = {}
  if (patch.name !== undefined) set.name = patch.name
  if (patch.entryPageId !== undefined) set.entry_page_id = patch.entryPageId
  if (Object.keys(set).length === 0) return
  await db
    .updateTable("hypercube.cubes")
    .set(set)
    .where("uuid", "=", uuid)
    .execute()
}

export async function deleteCube(db: Db, uuid: string): Promise<void> {
  await db.deleteFrom("hypercube.cubes").where("uuid", "=", uuid).execute()
}

// ---------------------------------------------------------------------------
// Pages CRUD (pages belong to a cube; the cube points at its entry page)
// ---------------------------------------------------------------------------

const pageColumns = ["id", "cube_id", "slug", "name", "source"] as const

export async function listAllPages(
  db: Db,
): Promise<{ cube_id: number; id: number; slug: string; name: string }[]> {
  const rows = await db
    .selectFrom("hypercube.pages")
    .select(["cube_id", "id", "slug", "name"])
    .orderBy("id")
    .execute()
  return rows as unknown as {
    cube_id: number
    id: number
    slug: string
    name: string
  }[]
}

export async function listPages(db: Db, cubeId: number): Promise<PageRow[]> {
  const rows = await db
    .selectFrom("hypercube.pages")
    .select(pageColumns as unknown as string[])
    .where("cube_id", "=", cubeId)
    .orderBy("id")
    .execute()
  return rows as unknown as PageRow[]
}

export async function getPage(
  db: Db,
  cubeId: number,
  slug: string,
): Promise<PageRow | null> {
  const row = await db
    .selectFrom("hypercube.pages")
    .select(pageColumns as unknown as string[])
    .where("cube_id", "=", cubeId)
    .where("slug", "=", slug)
    .executeTakeFirst()
  return (row as unknown as PageRow | undefined) ?? null
}

export async function createPage(
  db: Db,
  page: {
    cubeId: number
    slug: string
    name: string
    source: string
  },
): Promise<number> {
  const row = await db
    .insertInto("hypercube.pages")
    .values({
      cube_id: page.cubeId,
      slug: page.slug,
      name: page.name,
      source: page.source,
    })
    .returning("id")
    .executeTakeFirstOrThrow()
  return Number((row as { id: number }).id)
}

export async function updatePage(
  db: Db,
  cubeId: number,
  slug: string,
  patch: { name?: string; source?: string },
): Promise<void> {
  const set: Record<string, unknown> = {}
  if (patch.name !== undefined) set.name = patch.name
  if (patch.source !== undefined) set.source = patch.source
  if (Object.keys(set).length === 0) return
  await db
    .updateTable("hypercube.pages")
    .set(set)
    .where("cube_id", "=", cubeId)
    .where("slug", "=", slug)
    .execute()
}

export async function deletePage(
  db: Db,
  cubeId: number,
  slug: string,
): Promise<void> {
  await db
    .deleteFrom("hypercube.pages")
    .where("cube_id", "=", cubeId)
    .where("slug", "=", slug)
    .execute()
}
