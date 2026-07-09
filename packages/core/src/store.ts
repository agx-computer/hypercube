import { sql } from "kysely"
import type { Db } from "./db"

export interface CubeRow {
  id: number
  slug: string
  name: string
  description: string | null
  database_url: string
  schema_name: string
  expose: Record<string, { pageSize?: number; label?: string } | true>
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
      database_url text not null,
      schema_name text not null default 'public',
      expose jsonb not null default '{}',
      created_at timestamptz not null default now()
    )
  `.execute(db)
  ensured = true
}

const cubeColumns = [
  "id",
  "slug",
  "name",
  "description",
  "database_url",
  "schema_name",
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

export async function createCube(
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
      database_url: cube.database_url,
      schema_name: cube.schema_name || "public",
    })
    .execute()
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
