import { createDb } from "@hypercube/core"
import type { Db, FieldType } from "@hypercube/core"
import { validateJim } from "@hypercube/core/render"
import { createRuntime, introspect } from "@hypercube/core/postgres"
import {
  deleteTablesExcept,
  replaceRecords,
  upsertSyncedTable,
} from "@hypercube/core/store"
import type { ResourceRow, TableField } from "@hypercube/core/store"

export const FIELD_TYPES: FieldType[] = ["text", "number", "boolean", "date"]

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function validateSource(source: string): Promise<string | null> {
  try {
    await validateJim(source)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

export const STARTER_SOURCE = [
  "# {{ cube.name }}",
  "",
  "## Pages",
  "",
  '{{ pages.length ? pages.map(p => `- [${p.name}](${p.url})`).join("\\n") : "_No pages._" }}',
  "",
].join("\n")

function coerce(type: FieldType, raw: unknown): unknown {
  if (raw === null || raw === undefined || raw === "") return null
  if (type === "number") return Number(raw)
  return String(raw)
}

export function recordData(
  fields: TableField[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.type === "boolean") {
      data[field.name] = Boolean(values[field.name])
    } else {
      data[field.name] = coerce(field.type, values[field.name])
    }
  }
  return data
}

const SYNC_ROWS = 20

export async function syncPostgresResource(
  db: Db,
  resource: ResourceRow,
): Promise<number> {
  const target = createDb(resource.database_url ?? "", { max: 1 })
  try {
    const model = await introspect(target, resource.schema_name)
    const runtime = createRuntime(target, resource.schema_name, model)
    const slugs: string[] = []
    for (const entity of model.entities) {
      const fields: TableField[] = entity.fields.map((f) => ({
        name: f.name,
        type: f.type,
        required: !f.nullable,
      }))
      const tableId = await upsertSyncedTable(db, {
        resourceId: resource.id,
        slug: entity.name,
        name: entity.name,
        fields,
      })
      const { rows } = await runtime.list({
        entity: entity.name,
        page: 1,
        pageSize: SYNC_ROWS,
      })
      await replaceRecords(db, tableId, rows)
      slugs.push(entity.name)
    }
    await deleteTablesExcept(db, resource.id, slugs)
    return slugs.length
  } finally {
    await target.destroy()
  }
}
