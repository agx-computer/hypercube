import Handlebars from "handlebars"
import type { Block, CubeRow, ViewConfig, ViewFilter, ViewTemplate } from "./store"
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

export interface RenderMeta {
  cube: { name: string; slug: string }
  view: { name: string; slug: string }
  api?: { index: string; list: string; item: string }
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
  template: ViewTemplate | undefined,
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

export interface ViewListResult {
  page: number
  pages: number
  total: number
  markdown: string
}

const DEFAULT_PAGE_SIZE = 25

export function renderList(
  rows: Record<string, unknown>[],
  config: ViewConfig,
  meta: RenderMeta,
  opts?: { page?: number },
): ViewListResult {
  try {
    const template = config.list ?? config.template
    const pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE
    const total = rows.length
    const pages = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(Math.max(1, opts?.page ?? 1), pages)
    const start = (page - 1) * pageSize
    const pageRows = rows.slice(start, start + pageSize)
    const itemBase = meta.api?.item ?? meta.view.slug
    const linked = pageRows.map((r) => ({
      ...r,
      _link: `${itemBase}/${r._id ?? r.id}`,
    }))
    const m: RenderMeta = {
      ...meta,
      extra: {
        ...meta.extra,
        page,
        pages,
        total,
        hasNext: page < pages,
        hasPrev: page > 1,
        next: page + 1,
        prev: page - 1,
      },
    }
    const markdown = renderTemplate(template, linked, m, meta.view.name)
    return { page, pages, total, markdown }
  } catch (error) {
    throw new TemplateError(
      error instanceof Error ? error.message : String(error),
    )
  }
}

export function renderIndex(
  config: ViewConfig,
  meta: RenderMeta,
  info: { total: number; pages: number; pageSize: number },
): string {
  try {
    const template = config.index
    const m: RenderMeta = { ...meta, extra: info }
    return renderTemplate(template, [], m, meta.view.name)
  } catch (error) {
    throw new TemplateError(
      error instanceof Error ? error.message : String(error),
    )
  }
}

export function renderItem(
  row: Record<string, unknown>,
  config: ViewConfig,
  meta: RenderMeta,
): string {
  try {
    const template = config.item
    return renderTemplate(template, [row], meta, String(row._id ?? row.id ?? meta.view.name))
  } catch (error) {
    throw new TemplateError(
      error instanceof Error ? error.message : String(error),
    )
  }
}

export function defaultTemplates(fieldNames: string[]): {
  index: ViewTemplate
  list: ViewTemplate
  item: ViewTemplate
} {
  const first = fieldNames[0] ?? "id"
  const indexSource = [
    "# {{view.name}}",
    "",
    "{{extra.total}} records in this view.",
    "",
    "## API",
    "",
    "- List (paginated): `GET {{api.list}}?page=1`",
    "- One record: `GET {{api.item}}/{id}`",
    "- Add `Accept: text/markdown` for Markdown, otherwise JSON.",
    "- {{extra.pages}} page(s), {{extra.pageSize}} per page.",
    "",
    "Start at the list, then follow a record's link to its detail.",
    "",
  ].join("\n")
  const listBlocks: Block[] = [
    { type: "heading", level: 1, text: "{{view.name}}" },
    { type: "list", ordered: false, item: `[{{${first}}}]({{_link}})` },
  ]
  const itemBlocks: Block[] = [
    { type: "heading", level: 1, text: `{{${first}}}` },
    { type: "fields", fields: fieldNames },
  ]
  return {
    index: { mode: "handlebars", source: indexSource },
    list: { mode: "blocks", blocks: listBlocks },
    item: { mode: "blocks", blocks: itemBlocks },
  }
}
