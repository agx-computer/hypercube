import type { ViewConfig, ViewFilter } from "./store"

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
    const projected: Record<string, unknown> = { _id: row.id }
    for (const sel of selection) {
      const key = sel.label && sel.label.trim() ? sel.label : sel.field
      projected[key] = row[sel.field]
    }
    return projected
  })
}

export interface RenderMeta {
  cube: { name: string; uuid: string }
  page?: { name: string; slug: string }
  pages?: { name: string; slug: string; url: string }[]
  api?: { self: string; cube?: string }
}
