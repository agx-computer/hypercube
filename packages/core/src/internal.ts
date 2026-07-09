import type { Db } from "./db"
import type { Entity, SchemaModel } from "./model"
import type { CubeRow } from "./store"
import { getRecord, listRecords } from "./store"
import type { ListParams, ListResult, Runtime } from "./runtime"

export function cubeToModel(cube: CubeRow): SchemaModel {
  const entity: Entity = {
    name: cube.slug,
    key: "id",
    description: cube.description ?? undefined,
    fields: [
      { name: "id", type: "number", nullable: false },
      ...cube.fields.map((f) => ({
        name: f.name,
        type: f.type,
        nullable: !f.required,
      })),
    ],
    relations: [],
  }
  return { entities: [entity] }
}

export function createInternalRuntime(db: Db, cube: CubeRow): Runtime {
  function flatten(row: { id: number; data: Record<string, unknown> }) {
    return { id: row.id, ...row.data }
  }
  return {
    async list({ page, pageSize }: ListParams): Promise<ListResult> {
      const { rows, total } = await listRecords(db, cube.id, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })
      return { rows: rows.map(flatten), total }
    },
    async get(_entity, key) {
      const id = Number(key)
      if (Number.isNaN(id)) return null
      const row = await getRecord(db, cube.id, id)
      return row ? flatten(row) : null
    },
  }
}
