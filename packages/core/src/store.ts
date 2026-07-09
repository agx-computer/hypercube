import { sql } from "kysely"
import type { Db } from "./db"
import type { FieldType } from "./model"

export type CubeSource = "postgres" | "internal"

export interface CubeField {
  name: string
  type: FieldType
  required: boolean
}

export interface CubeRow {
  id: number
  slug: string
  name: string
  description: string | null
  source: CubeSource
  database_url: string | null
  schema_name: string
  fields: CubeField[]
  expose: Record<string, { pageSize?: number; label?: string } | true>
}

export interface RecordRow {
  id: number
  cube_id: number
  data: Record<string, unknown>
  created_at: string
}

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
}

export interface ViewRow {
  id: number
  cube_id: number
  slug: string
  name: string
  config: ViewConfig
}

let ensured = false

export async function ensureStore(db: Db): Promise<void> {
  if (ensured) return
  await sql`create schema if not exists hypercube`.execute(db)
  await sql`
    create table if not exists hypercube.cubes (
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
  await sql`alter table hypercube.cubes add column if not exists source text not null default 'postgres'`.execute(db)
  await sql`alter table hypercube.cubes add column if not exists fields jsonb not null default '[]'`.execute(db)
  await sql`alter table hypercube.cubes alter column database_url drop not null`.execute(db)
  await sql`
    create table if not exists hypercube.records (
      id serial primary key,
      cube_id integer not null references hypercube.cubes(id) on delete cascade,
      data jsonb not null default '{}',
      created_at timestamptz not null default now()
    )
  `.execute(db)
  await sql`
    create table if not exists hypercube.views (
      id serial primary key,
      cube_id integer not null references hypercube.cubes(id) on delete cascade,
      slug text not null,
      name text not null,
      config jsonb not null default '{}',
      created_at timestamptz not null default now(),
      unique (cube_id, slug)
    )
  `.execute(db)
  ensured = true
}

const cubeColumns = [
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

export async function createPostgresCube(
  db: Db,
  cube: {
    slug: string
    name: string
    description: string
    database_url: string
    schema_name: string
  },
): Promise<void> {
  await db
    .insertInto("hypercube.cubes")
    .values({
      slug: cube.slug,
      name: cube.name,
      description: cube.description || null,
      source: "postgres",
      database_url: cube.database_url,
      schema_name: cube.schema_name || "public",
    })
    .execute()
}

export async function createInternalCube(
  db: Db,
  cube: {
    slug: string
    name: string
    description: string
    fields: CubeField[]
  },
): Promise<void> {
  await db
    .insertInto("hypercube.cubes")
    .values({
      slug: cube.slug,
      name: cube.name,
      description: cube.description || null,
      source: "internal",
      database_url: null,
      schema_name: "public",
      fields: JSON.stringify(cube.fields),
    })
    .execute()
}

export async function addField(
  db: Db,
  slug: string,
  field: CubeField,
): Promise<void> {
  const cube = await getCube(db, slug)
  if (!cube) throw new Error("no such cube")
  if (cube.fields.some((f) => f.name === field.name)) {
    throw new Error("field already exists")
  }
  await updateCubeFields(db, slug, [...cube.fields, field])
}

export async function updateField(
  db: Db,
  slug: string,
  original: string,
  field: CubeField,
): Promise<void> {
  const cube = await getCube(db, slug)
  if (!cube) throw new Error("no such cube")
  const fields = cube.fields.map((f) => (f.name === original ? field : f))
  await updateCubeFields(db, slug, fields)
  if (original !== field.name) {
    await sql`
      update hypercube.records
      set data = (data - ${original}::text)
        || jsonb_build_object(${field.name}::text, data -> ${original}::text)
      where cube_id = ${cube.id} and data ? ${original}::text
    `.execute(db)
  }
}

export async function deleteField(
  db: Db,
  slug: string,
  name: string,
): Promise<void> {
  const cube = await getCube(db, slug)
  if (!cube) throw new Error("no such cube")
  await updateCubeFields(
    db,
    slug,
    cube.fields.filter((f) => f.name !== name),
  )
  await sql`
    update hypercube.records set data = data - ${name}
    where cube_id = ${cube.id}
  `.execute(db)
}

export async function updateCubeFields(
  db: Db,
  slug: string,
  fields: CubeField[],
): Promise<void> {
  await db
    .updateTable("hypercube.cubes")
    .set({ fields: JSON.stringify(fields) })
    .where("slug", "=", slug)
    .execute()
}

export async function updateCubeMeta(
  db: Db,
  slug: string,
  meta: { name: string; description: string },
): Promise<void> {
  await db
    .updateTable("hypercube.cubes")
    .set({ name: meta.name, description: meta.description || null })
    .where("slug", "=", slug)
    .execute()
}

export async function deleteCube(db: Db, slug: string): Promise<void> {
  await db.deleteFrom("hypercube.cubes").where("slug", "=", slug).execute()
}

export async function saveExpose(
  db: Db,
  slug: string,
  expose: Record<string, true>,
): Promise<void> {
  await db
    .updateTable("hypercube.cubes")
    .set({ expose: JSON.stringify(expose) })
    .where("slug", "=", slug)
    .execute()
}

export async function listRecords(
  db: Db,
  cubeId: number,
  opts: { limit: number; offset: number },
): Promise<{ rows: RecordRow[]; total: number }> {
  const rows = await db
    .selectFrom("hypercube.records")
    .select(["id", "cube_id", "data", "created_at"])
    .where("cube_id", "=", cubeId)
    .orderBy("id")
    .limit(opts.limit)
    .offset(opts.offset)
    .execute()
  const counted = await db
    .selectFrom("hypercube.records")
    .select(sql<number>`count(*)::int`.as("n"))
    .where("cube_id", "=", cubeId)
    .executeTakeFirst()
  return { rows: rows as unknown as RecordRow[], total: counted?.n ?? 0 }
}

export async function getRecord(
  db: Db,
  cubeId: number,
  id: number,
): Promise<RecordRow | null> {
  const row = await db
    .selectFrom("hypercube.records")
    .select(["id", "cube_id", "data", "created_at"])
    .where("cube_id", "=", cubeId)
    .where("id", "=", id)
    .executeTakeFirst()
  return (row as unknown as RecordRow | undefined) ?? null
}

export async function insertRecord(
  db: Db,
  cubeId: number,
  data: Record<string, unknown>,
): Promise<void> {
  await db
    .insertInto("hypercube.records")
    .values({ cube_id: cubeId, data: JSON.stringify(data) })
    .execute()
}

export async function updateRecord(
  db: Db,
  cubeId: number,
  id: number,
  data: Record<string, unknown>,
): Promise<void> {
  await db
    .updateTable("hypercube.records")
    .set({ data: JSON.stringify(data) })
    .where("cube_id", "=", cubeId)
    .where("id", "=", id)
    .execute()
}

export async function deleteRecord(
  db: Db,
  cubeId: number,
  id: number,
): Promise<void> {
  await db
    .deleteFrom("hypercube.records")
    .where("cube_id", "=", cubeId)
    .where("id", "=", id)
    .execute()
}

const viewColumns = ["id", "cube_id", "slug", "name", "config"] as const

export async function listViews(db: Db, cubeId: number): Promise<ViewRow[]> {
  const rows = await db
    .selectFrom("hypercube.views")
    .select(viewColumns as unknown as string[])
    .where("cube_id", "=", cubeId)
    .orderBy("id")
    .execute()
  return rows as unknown as ViewRow[]
}

export async function getView(
  db: Db,
  cubeId: number,
  slug: string,
): Promise<ViewRow | null> {
  const row = await db
    .selectFrom("hypercube.views")
    .select(viewColumns as unknown as string[])
    .where("cube_id", "=", cubeId)
    .where("slug", "=", slug)
    .executeTakeFirst()
  return (row as unknown as ViewRow | undefined) ?? null
}

export async function createView(
  db: Db,
  view: { cubeId: number; slug: string; name: string; config: ViewConfig },
): Promise<void> {
  await db
    .insertInto("hypercube.views")
    .values({
      cube_id: view.cubeId,
      slug: view.slug,
      name: view.name,
      config: JSON.stringify(view.config),
    })
    .execute()
}

export async function updateView(
  db: Db,
  cubeId: number,
  slug: string,
  patch: { name: string; config: ViewConfig },
): Promise<void> {
  await db
    .updateTable("hypercube.views")
    .set({ name: patch.name, config: JSON.stringify(patch.config) })
    .where("cube_id", "=", cubeId)
    .where("slug", "=", slug)
    .execute()
}

export async function deleteView(
  db: Db,
  cubeId: number,
  slug: string,
): Promise<void> {
  await db
    .deleteFrom("hypercube.views")
    .where("cube_id", "=", cubeId)
    .where("slug", "=", slug)
    .execute()
}
