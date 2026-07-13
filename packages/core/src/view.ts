import { compileJim, type CompiledJim } from "./jim"
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

export class TemplateError extends Error {}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const e = error as { message?: unknown; position?: unknown }
    const msg =
      typeof e.message === "string" ? e.message : String(e.message)
    return typeof e.position === "number"
      ? `${msg} (position ${e.position})`
      : msg
  }
  return String(error)
}

function mdCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value)
  return text.replace(/\|/g, "\\|")
}

function mdTable(
  rows: Record<string, unknown>[],
  cols: string[],
): string {
  if (cols.length === 0) return ""
  const head = `| ${cols.join(" | ")} |`
  const sep = `| ${cols.map(() => "---").join(" | ")} |`
  const body = rows
    .map((r) => `| ${cols.map((c) => mdCell(r[c])).join(" | ")} |`)
    .join("\n")
  return `${head}\n${sep}\n${body}`
}

function table(rows: unknown, cols?: unknown): string {
  if (!Array.isArray(rows) || rows.length === 0) return "_No records._"
  const names = Array.isArray(cols)
    ? cols.map((c) => String(c))
    : typeof cols === "string" && cols.trim()
      ? cols
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : Object.keys(rows[0] as Record<string, unknown>).filter(
          (c) => !c.startsWith("_"),
        )
  return mdTable(rows as Record<string, unknown>[], names)
}

const compiledPages = new Map<string, CompiledJim>()

function compiledFor(source: string): CompiledJim {
  const hit = compiledPages.get(source)
  if (hit) return hit
  if (compiledPages.size > 500) compiledPages.clear()
  const page = compileJim(source)
  compiledPages.set(source, page)
  return page
}

export interface RenderMeta {
  cube: { name: string; uuid: string }
  page?: { name: string; slug: string }
  pages?: { name: string; slug: string; url: string }[]
  api?: { self: string; cube?: string }
}

function resolveLinks(
  markdown: string,
  pages: { slug: string; url: string }[],
): string {
  let out = markdown
  for (const p of pages) {
    out = out.split(`](${p.slug})`).join(`](${p.url})`)
  }
  return out
}

/** Render a JIM page: evaluate {{…}} expressions, return Markdown. */
export function renderPage(
  source: string,
  data: Record<string, unknown>,
  meta: RenderMeta,
): string {
  try {
    const scope: Record<string, unknown> = {
      table,
      ...data,
      cube: meta.cube,
      page: meta.page,
      pages: (meta.pages ?? []).filter((p) => p.slug !== meta.page?.slug),
      api: meta.api,
    }
    const out = compiledFor(source).render(scope)
    return resolveLinks(out, meta.pages ?? [])
  } catch (error) {
    throw new TemplateError(describeError(error))
  }
}
