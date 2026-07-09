import type { CubeRow, ViewConfig, ViewFilter } from "./store"
import type { Entity, SchemaModel } from "./model"

function matches(value: unknown, filter: ViewFilter): boolean {
  const v = value == null ? "" : String(value)
  const t = filter.value
  switch (filter.op) {
    case "eq":
      return v === t
    case "neq":
      return v !== t
    case "contains":
      return v.toLowerCase().includes(t.toLowerCase())
    case "gt":
      return Number(v) > Number(t)
    case "lt":
      return Number(v) < Number(t)
    default:
      return true
  }
}

export function applyView(
  rows: Record<string, unknown>[],
  config: ViewConfig,
): Record<string, unknown>[] {
  let out = rows

  for (const filter of config.filters ?? []) {
    out = out.filter((row) => matches(row[filter.field], filter))
  }

  if (config.sort) {
    const { field, dir } = config.sort
    out = [...out].sort((a, b) => {
      const av = a[field]
      const bv = b[field]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv))
      return dir === "desc" ? -cmp : cmp
    })
  }

  const selection = config.fields ?? []
  if (selection.length === 0) return out

  return out.map((row) => {
    const projected: Record<string, unknown> = {}
    for (const sel of selection) {
      const key = sel.label && sel.label.trim() ? sel.label : sel.field
      projected[key] = row[sel.field]
    }
    return projected
  })
}

export function viewModel(cube: CubeRow, config: ViewConfig): SchemaModel {
  const selection = config.fields ?? []
  const base = cube.fields
  const fields =
    selection.length === 0
      ? [{ name: "id", type: "number" as const, nullable: false }, ...base.map((f) => ({ name: f.name, type: f.type, nullable: !f.required }))]
      : selection.map((sel) => {
          const src = base.find((f) => f.name === sel.field)
          const name = sel.label && sel.label.trim() ? sel.label : sel.field
          return {
            name,
            type: src?.type ?? ("text" as const),
            nullable: src ? !src.required : true,
          }
        })
  const entity: Entity = {
    name: cube.slug,
    key: "id",
    description: cube.description ?? undefined,
    fields,
    relations: [],
  }
  return { entities: [entity] }
}
