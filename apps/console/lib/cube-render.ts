import { applyTransform, applyView } from "@hypercube/core"
import {
  ensureStore,
  getCube,
  getResourceById,
  getViewById,
} from "@hypercube/core/store"
import type { CubeRow, ResourceRow, ViewRow } from "@hypercube/core/store"
import type { Db } from "@hypercube/core"
import { instanceDb } from "@/lib/db"
import { loadRows } from "@/lib/resource-data"

export interface CubeContext {
  db: Db
  cube: CubeRow
  view: ViewRow
  resource: ResourceRow
  rows: Record<string, unknown>[]
}

/** Load a cube's data: resource -> view transform -> JSONata transform. */
export async function loadCube(slug: string): Promise<CubeContext | null> {
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, slug)
  if (!cube) return null
  const view = await getViewById(db, cube.view_id)
  const resource = await getResourceById(db, cube.resource_id)
  if (!view || !resource) return null
  const raw = await loadRows(db, resource)
  const viewed = applyView(raw, view.config)
  const rows = await applyTransform(viewed, cube.transform)
  return { db, cube, view, resource, rows }
}

export function cubeMeta(
  request: Request,
  ctx: CubeContext,
): {
  cube: { name: string; slug: string }
  view: { name: string; slug: string }
  api: { self: string }
} {
  const h = request.headers
  const host = h.get("x-forwarded-host")
  const proto = h.get("x-forwarded-proto") ?? "https"
  const origin = host ? `${proto}://${host}` : new URL(request.url).origin
  return {
    cube: { name: ctx.cube.name, slug: ctx.cube.slug },
    view: { name: ctx.cube.name, slug: ctx.cube.slug },
    api: { self: `${origin}/c/${ctx.cube.slug}` },
  }
}
