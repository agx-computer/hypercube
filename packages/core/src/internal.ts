import type { Db } from "./db"
import type { Entity, SchemaModel } from "./model"
import type { ResourceRow } from "./store"
import { getRecord, listRecords } from "./store"
import type { ListParams, ListResult, Runtime } from "./runtime"

export function resourceToModel(resource: ResourceRow): SchemaModel {
  const entity: Entity = {
    name: resource.slug,
    key: "id",
    description: resource.description ?? undefined,
    fields: [
      { name: "id", type: "number", nullable: false },
      ...resource.fields.map((f) => ({
        name: f.name,
        type: f.type,
        nullable: !f.required,
      })),
    ],
    relations: [],
  }
  return { entities: [entity] }
}

export function createInternalRuntime(db: Db, resource: ResourceRow): Runtime {
  function flatten(row: { id: number; data: Record<string, unknown> }) {
    return { id: row.id, ...row.data }
  }
  return {
    async list({ page, pageSize }: ListParams): Promise<ListResult> {
      const { rows, total } = await listRecords(db, resource.id, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })
      return { rows: rows.map(flatten), total }
    },
    async get(_entity, key) {
      const id = Number(key)
      if (Number.isNaN(id)) return null
      const row = await getRecord(db, resource.id, id)
      return row ? flatten(row) : null
    },
  }
}
