import type { Db, Policy, SchemaModel, SiteEntity } from "@hypercube/core"
import { createDb, resolveSite } from "@hypercube/core"
import { createRuntime, introspect } from "@hypercube/core/postgres"
import type { CubeRow } from "@hypercube/core/store"
import { ensureStore, getCube } from "@hypercube/core/store"
import { instanceDb } from "./db"

const MODEL_TTL_MS = 60_000
const models = new Map<string, { model: SchemaModel; at: number }>()

export function invalidateModel(slug: string): void {
  models.delete(slug)
}

async function cubeModel(cube: CubeRow, target: Db): Promise<SchemaModel> {
  const cached = models.get(cube.slug)
  if (cached && Date.now() - cached.at < MODEL_TTL_MS) return cached.model
  const model = await introspect(target, cube.schema_name)
  models.set(cube.slug, { model, at: Date.now() })
  return model
}

export function pickFields(
  row: Record<string, unknown>,
  entity: SiteEntity,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of entity.fields) {
    if (field.name in row) out[field.name] = row[field.name]
  }
  return out
}

export interface CubeContext {
  cube: CubeRow
  site: ReturnType<typeof resolveSite>
  target: Db
}

export async function withCube<T>(
  slug: string,
  fn: (ctx: CubeContext) => Promise<T>,
): Promise<T | null> {
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, slug)
  if (!cube) return null
  const target = createDb(cube.database_url, { max: 1 })
  try {
    const model = await cubeModel(cube, target)
    const policy: Policy = {
      name: cube.name,
      description: cube.description ?? "",
      origin: "",
      expose: cube.expose,
    }
    const site = resolveSite(model, policy)
    return await fn({ cube, site, target })
  } finally {
    await target.destroy()
  }
}

export function runtimeFor(ctx: CubeContext) {
  const model: SchemaModel = { entities: ctx.site.entities }
  return createRuntime(ctx.target, ctx.cube.schema_name, model)
}
