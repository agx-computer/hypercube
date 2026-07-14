import type { RenderMeta } from "@hypercube/core"
import {
  getCube,
  listPages,
  listResources,
  listRows,
  listTables,
} from "@hypercube/core/store"
import type { CubeRow, PageRow } from "@hypercube/core/store"
import type { Db } from "@hypercube/core"

export interface CubeContext {
  db: Db
  cube: CubeRow
  pages: PageRow[]
}

export async function loadCube(db: Db, slug: string): Promise<CubeContext | null> {
  const cube = await getCube(db, slug)
  if (!cube) return null
  const pages = await listPages(db, cube.id)
  return { db, cube, pages }
}

export function entryPage(ctx: CubeContext): PageRow | null {
  return (
    ctx.pages.find((p) => p.id === ctx.cube.entry_page_id) ??
    ctx.pages[0] ??
    null
  )
}

const ACCESSOR = /\bresources\b(?:\.([A-Za-z_$][\w$]*)|\[\s*(["'])([^"']*)\2\s*\])/g

function referencedSlugs(source: string): Set<string> {
  const slugs = new Set<string>()
  for (const match of source.matchAll(ACCESSOR)) {
    slugs.add(match[1] ?? match[3])
  }
  return slugs
}

export async function loadPageEnv(
  db: Db,
  source: string,
): Promise<Record<string, unknown>> {
  const referenced = referencedSlugs(source)
  const resources: Record<string, unknown> = {}
  if (referenced.size > 0) {
    for (const resource of await listResources(db)) {
      const byName = referenced.has(resource.name)
      const byUuid = referenced.has(resource.uuid)
      if (!byName && !byUuid) continue
      const tables: Record<string, unknown[]> = {}
      for (const table of await listTables(db, resource.id)) {
        const rows = await listRows(db, table.id, 100000)
        tables[table.name] = rows
        tables[table.slug] = rows
      }
      if (byName) resources[resource.name] = tables
      if (byUuid) resources[resource.uuid] = tables
    }
  }
  return { resources }
}

export function buildMeta(
  origin: string,
  cube: CubeRow,
  pages: PageRow[],
  page: PageRow | null,
): RenderMeta {
  const cubeUrl = `${origin}/c/${cube.uuid}`
  const entryId = cube.entry_page_id ?? pages[0]?.id ?? null
  const pageUrl = (p: PageRow) =>
    p.id === entryId ? cubeUrl : `${cubeUrl}/${p.slug}`
  return {
    cube: { name: cube.name, uuid: cube.uuid },
    ...(page ? { page: { name: page.name, slug: page.slug } } : {}),
    pages: pages.map((p) => ({ name: p.name, slug: p.slug, url: pageUrl(p) })),
    api: { self: page ? pageUrl(page) : cubeUrl, cube: cubeUrl },
  }
}
