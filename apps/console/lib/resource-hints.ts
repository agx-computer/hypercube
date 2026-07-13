import { listResources, listRows, listTables } from "@hypercube/core/store"
import type { Db } from "@hypercube/core"
import type { ResourceHint } from "@/components/code-editor"

export async function resourceHints(db: Db): Promise<ResourceHint[]> {
  const resources = await listResources(db)
  return Promise.all(
    resources.map(async (resource) => ({
      uuid: resource.uuid,
      name: resource.name,
      tables: await Promise.all(
        (await listTables(db, resource.id)).map(async (table) => ({
          slug: table.slug,
          name: table.name,
          fields: table.fields.map((f) => ({ name: f.name, type: f.type })),
          sample: (await listRows(db, table.id, 1))[0] ?? null,
        })),
      ),
    })),
  )
}
