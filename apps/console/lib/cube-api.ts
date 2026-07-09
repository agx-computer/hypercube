import type { Db, Policy, SchemaModel, SiteEntity } from "@hypercube/core"
import {
  createDb,
  createInternalRuntime,
  cubeToModel,
  resolveSite,
} from "@hypercube/core"
import { createRuntime, introspect } from "@hypercube/core/postgres"
import type { CubeRow } from "@hypercube/core/store"
import { ensureStore, getCube } from "@hypercube/core/store"
import type { Runtime } from "@hypercube/core"
import { instanceDb } from "./db"

const MODEL_TTL_MS = 60_000
const models = new Map<string, { model: SchemaModel; at: number }>()

export function invalidateModel(slug: string): void {
  models.delete(slug)
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
  runtime: Runtime
}

async function buildPostgres(
  cube: CubeRow,
): Promise<{ model: SchemaModel; runtime: Runtime; close: () => Promise<void> }> {
  const target = createDb(cube.database_url ?? "", { max: 1 })
  const cached = models.get(cube.slug)
  let model = cached && Date.now() - cached.at < MODEL_TTL_MS ? cached.model : null
  if (!model) {
    model = await introspect(target, cube.schema_name)
    models.set(cube.slug, { model, at: Date.now() })
  }
  const runtime = createRuntime(target, cube.schema_name, model)
  return { model, runtime, close: () => target.destroy() }
}

async function buildInternal(
  db: Db,
  cube: CubeRow,
): Promise<{ model: SchemaModel; runtime: Runtime; close: () => Promise<void> }> {
  const model = cubeToModel(cube)
  const runtime = createInternalRuntime(db, cube)
  return { model, runtime, close: async () => {} }
}

export async function withCube<T>(
  slug: string,
  fn: (ctx: CubeContext) => Promise<T>,
): Promise<T | null> {
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, slug)
  if (!cube) return null
  const built =
    cube.source === "internal"
      ? await buildInternal(db, cube)
      : await buildPostgres(cube)
  try {
    const policy: Policy = {
      name: cube.name,
      description: cube.description ?? "",
      origin: "",
      expose:
        cube.source === "internal"
          ? Object.fromEntries(built.model.entities.map((e) => [e.name, true]))
          : cube.expose,
    }
    const site = resolveSite(built.model, policy)
    return await fn({ cube, site, runtime: built.runtime })
  } finally {
    await built.close()
  }
}
