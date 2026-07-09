import { sql } from "kysely"
import type { Db } from "../db"
import type { SchemaModel } from "../model"
import type { ListParams, ListResult, Runtime } from "../runtime"

export function createRuntime(
  db: Db,
  schema: string,
  model: SchemaModel,
): Runtime {
  const entityByName = new Map(model.entities.map((e) => [e.name, e]))

  function resolve(entityName: string) {
    const entity = entityByName.get(entityName)
    if (!entity) throw new Error(`unknown entity: ${entityName}`)
    return entity
  }

  const table = (name: string) => `${schema}.${name}`

  return {
    async list({ entity, page, pageSize }: ListParams): Promise<ListResult> {
      const e = resolve(entity)
      const offset = (page - 1) * pageSize
      const rows = await db
        .selectFrom(table(e.name))
        .selectAll()
        .orderBy(e.key)
        .limit(pageSize)
        .offset(offset)
        .execute()
      const counted = await db
        .selectFrom(table(e.name))
        .select(sql<number>`count(*)::int`.as("n"))
        .executeTakeFirst()
      return {
        rows: rows as Record<string, unknown>[],
        total: counted?.n ?? 0,
      }
    },

    async get(entity, key) {
      const e = resolve(entity)
      const keyField = e.fields.find((f) => f.name === e.key)
      let value: string | number = key
      if (keyField?.type === "number") {
        value = Number(key)
        if (Number.isNaN(value)) return null
      }
      const row = await db
        .selectFrom(table(e.name))
        .selectAll()
        .where(e.key, "=", value)
        .limit(1)
        .executeTakeFirst()
      return (row as Record<string, unknown> | undefined) ?? null
    },
  }
}
