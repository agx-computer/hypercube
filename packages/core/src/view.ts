import Handlebars from "handlebars"
import jsonata from "jsonata"
import type { Block, PageTemplate, ResourceRow, ViewConfig, ViewFilter } from "./store"
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
    const projected: Record<string, unknown> = { _id: row.id }
    for (const sel of selection) {
      const key = sel.label && sel.label.trim() ? sel.label : sel.field
      projected[key] = row[sel.field]
    }
    return projected
  })
}

export function viewModel(resource: ResourceRow, config: ViewConfig): SchemaModel {
  const selection = config.fields ?? []
  const base = resource.fields
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
    name: resource.slug,
    key: "id",
    description: resource.description ?? undefined,
    fields,
    relations: [],
  }
  return { entities: [entity] }
}

const hb = Handlebars.create()

function autoMarkdown(
  rows: Record<string, unknown>[],
  title: string,
): string {
  if (rows.length === 0) return `# ${title}\n\n_No records._\n`
  const cols = Object.keys(rows[0] ?? {}).filter(
    (c) => c !== "_id" && c !== "_link",
  )
  const head = `| ${cols.join(" | ")} |`
  const sep = `| ${cols.map(() => "---").join(" | ")} |`
  const body = rows
    .map(
      (r) =>
        `| ${cols
          .map((c) => String(r[c] ?? "").replace(/\|/g, "\\|"))
          .join(" | ")} |`,
    )
    .join("\n")
  return `# ${title}\n\n${head}\n${sep}\n${body}\n`
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

export interface RenderMeta {
  cube: { name: string; slug: string }
  view: { name: string; slug: string }
  api?: { self: string }
  extra?: Record<string, unknown>
}

function renderHandlebars(
  source: string,
  rows: Record<string, unknown>[],
  meta: RenderMeta,
): string {
  const single = rows.length === 1 ? rows[0] : {}
  const compiled = hb.compile(source, { noEscape: true })
  return compiled({
    ...single,
    records: rows,
    record: rows[0] ?? {},
    count: rows.length,
    cube: meta.cube,
    view: meta.view,
    api: meta.api,
    extra: meta.extra,
  })
}

function interpolate(
  text: string,
  scope: Record<string, unknown>,
): string {
  return hb.compile(text, { noEscape: true })(scope)
}

function mdTable(
  rows: Record<string, unknown>[],
  cols: string[],
): string {
  if (cols.length === 0) return ""
  const head = `| ${cols.join(" | ")} |`
  const sep = `| ${cols.map(() => "---").join(" | ")} |`
  const body = rows
    .map(
      (r) =>
        `| ${cols
          .map((c) => String(r[c] ?? "").replace(/\|/g, "\\|"))
          .join(" | ")} |`,
    )
    .join("\n")
  return `${head}\n${sep}\n${body}`
}

function compileBlocks(
  blocks: Block[],
  rows: Record<string, unknown>[],
  meta: RenderMeta,
): string {
  const single = rows.length === 1 ? rows[0] : {}
  const scope = {
    ...single,
    records: rows,
    record: rows[0] ?? {},
    count: rows.length,
    cube: meta.cube,
    view: meta.view,
    api: meta.api,
    extra: meta.extra,
  }
  const parts: string[] = []
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        parts.push(`${"#".repeat(block.level)} ${interpolate(block.text, scope)}`)
        break
      case "text":
        parts.push(interpolate(block.text, scope))
        break
      case "list": {
        const marker = (i: number) => (block.ordered ? `${i + 1}.` : "-")
        parts.push(
          rows
            .map((r, i) => `${marker(i)} ${interpolate(block.item, r)}`)
            .join("\n"),
        )
        break
      }
      case "table":
        parts.push(mdTable(rows, block.fields))
        break
      case "fields":
        parts.push(
          rows
            .map((r) =>
              block.fields
                .map((f) => `- **${f}**: ${String(r[f] ?? "")}`)
                .join("\n"),
            )
            .join("\n\n"),
        )
        break
    }
  }
  return parts.filter((p) => p.trim()).join("\n\n") + "\n"
}

function renderTemplate(
  template: PageTemplate | undefined,
  rows: Record<string, unknown>[],
  meta: RenderMeta,
  fallbackTitle: string,
): string {
  if (!template) return autoMarkdown(rows, fallbackTitle)
  if (template.mode === "handlebars") {
    if (!template.source.trim()) return autoMarkdown(rows, fallbackTitle)
    return renderHandlebars(template.source, rows, meta)
  }
  if (template.blocks.length === 0) return autoMarkdown(rows, fallbackTitle)
  return compileBlocks(template.blocks, rows, meta)
}

const DEFAULT_PAGE_SIZE = 25

/** Apply a JSONata expression (data -> data). Empty expr = passthrough. */
export async function applyTransform(
  rows: Record<string, unknown>[],
  expr: string,
): Promise<Record<string, unknown>[]> {
  const e = expr.trim()
  if (!e) return rows
  try {
    const compiled = jsonata(e)
    const result = await compiled.evaluate(rows)
    if (Array.isArray(result)) return result as Record<string, unknown>[]
    if (result == null) return []
    return [result as Record<string, unknown>]
  } catch (error) {
    throw new TemplateError(describeError(error))
  }
}

/** Render already-transformed rows into a single Markdown document. */
export function renderCube(
  rows: Record<string, unknown>[],
  template: PageTemplate | null | undefined,
  meta: RenderMeta,
): string {
  try {
    const m: RenderMeta = {
      ...meta,
      extra: { ...meta.extra, total: rows.length },
    }
    return renderTemplate(template ?? undefined, rows, m, meta.view.name)
  } catch (error) {
    throw new TemplateError(describeError(error))
  }
}

export function defaultTemplate(fieldNames: string[]): PageTemplate {
  const blocks: Block[] = [
    { type: "heading", level: 1, text: "{{view.name}}" },
    { type: "text", text: "{{extra.total}} records." },
    { type: "table", fields: fieldNames },
  ]
  return { mode: "blocks", blocks }
}
