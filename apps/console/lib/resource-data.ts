import { createDb } from "@hypercube/core"
import { createInternalRuntime, resourceToModel } from "@hypercube/core"
import { createRuntime, introspect } from "@hypercube/core/postgres"
import type { ResourceRow } from "@hypercube/core/store"
import { listRecords } from "@hypercube/core/store"
import type { Db } from "@hypercube/core"

/**
 * Load a resource's records as flat rows ({ id, ...data }).
 * Internal resources read from hypercube.records; postgres resources
 * introspect + query the external database.
 */
export async function loadRows(
  db: Db,
  resource: ResourceRow,
  limit = 100000,
): Promise<Record<string, unknown>[]> {
  if (resource.source === "internal") {
    const { rows } = await listRecords(db, resource.id, { limit, offset: 0 })
    return rows.map((r) => ({ id: r.id, ...r.data }))
  }
  const target = createDb(resource.database_url ?? "", { max: 1 })
  try {
    const model = await introspect(target, resource.schema_name)
    const entity = model.entities[0]
    if (!entity) return []
    const runtime = createRuntime(target, resource.schema_name, model)
    const { rows } = await runtime.list({
      entity: entity.name,
      page: 1,
      pageSize: limit,
    })
    return rows
  } finally {
    await target.destroy()
  }
}
