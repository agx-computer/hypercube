import {
  newQuickJSWASMModule,
  newVariant,
  RELEASE_SYNC,
  type QuickJSWASMModule,
} from "quickjs-emscripten"
import wasmModule from "@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm"
import {
  JimSyntaxError,
  lineOf,
  parseJim,
  splitJim,
  topLevelDecls,
} from "./jim"
import type { RenderMeta } from "./view"

const variant = newVariant(RELEASE_SYNC, { wasmModule })

let modulePromise: Promise<QuickJSWASMModule> | null = null

function engine(): Promise<QuickJSWASMModule> {
  modulePromise ??= newQuickJSWASMModule(variant)
  return modulePromise
}

interface VmDoc {
  frontmatter: string
  names: string[]
  parts: { kind: "text" | "expr"; value: string; line: number; desc: string }[]
  validateOnly?: boolean
}

function describe(code: string): string {
  const flat = code.trim().replace(/\s+/g, " ")
  return flat.length > 60 ? `${flat.slice(0, 57)}…` : flat
}

function prepare(source: string): VmDoc {
  const doc = splitJim(source)
  const segments = parseJim(doc.body)
  const parts = segments.map((segment) => {
    if (segment.kind === "text") {
      return { kind: "text" as const, value: segment.value, line: 0, desc: "" }
    }
    const line = doc.bodyLine - 1 + lineOf(doc.body, segment.offset)
    if (!segment.value.trim()) {
      throw new JimSyntaxError("empty {{ }} expression", line)
    }
    return {
      kind: "expr" as const,
      value: segment.value,
      line,
      desc: describe(segment.value),
    }
  })
  return {
    frontmatter: doc.frontmatter,
    names: topLevelDecls(doc.frontmatter),
    parts,
  }
}

const PROGRAM = `
;(() => {
  const doc = JSON.parse(__jimDoc)
  const env = JSON.parse(__jimEnv)
  const message = (e) => (e && e.message ? e.message : String(e))
  const fail = (msg, line) => JSON.stringify({ error: { message: msg, line } })
  let declare = null
  if (doc.frontmatter.trim()) {
    const returns = doc.names
      .map((n) => n + ': typeof ' + n + ' === "undefined" ? undefined : ' + n)
      .join(", ")
    try {
      declare = new Function(
        "env",
        "with (env) {\\n" + doc.frontmatter + "\\n;return { " + returns + " }\\n}",
      )
    } catch (e) {
      return fail("frontmatter: " + message(e), 2)
    }
  }
  for (const part of doc.parts) {
    if (part.kind !== "expr") continue
    try {
      part.fn = new Function("env", "with (env) { return (" + part.value + "\\n) }")
    } catch (e) {
      return fail("{{ " + part.desc + " }}: " + message(e), part.line)
    }
  }
  if (doc.validateOnly) return JSON.stringify({ out: "" })
  const toText = (value) => {
    if (value == null) return ""
    if (typeof value === "string") return value
    if (Array.isArray(value)) return value.map(toText).join("")
    return String(value)
  }
  const mdCell = (value) => {
    if (value === null || value === undefined) return ""
    const text = typeof value === "object" ? JSON.stringify(value) : String(value)
    return text.replace(/\\|/g, "\\\\|")
  }
  const mdTable = (rows, cols) => {
    if (cols.length === 0) return ""
    const head = "| " + cols.join(" | ") + " |"
    const sep = "| " + cols.map(() => "---").join(" | ") + " |"
    const body = rows
      .map((r) => "| " + cols.map((c) => mdCell(r[c])).join(" | ") + " |")
      .join("\\n")
    return head + "\\n" + sep + "\\n" + body
  }
  const table = (rows, cols) => {
    if (!Array.isArray(rows) || rows.length === 0) return "_No records._"
    const names = Array.isArray(cols)
      ? cols.map((c) => String(c))
      : typeof cols === "string" && cols.trim()
        ? cols.split(",").map((c) => c.trim()).filter(Boolean)
        : Object.keys(rows[0]).filter((c) => !c.startsWith("_"))
    return mdTable(rows, names)
  }
  if (!("table" in env)) env.table = table
  for (const key of ["cube", "page", "pages", "api"]) {
    if (!(key in env)) env[key] = undefined
  }
  let scope = env
  if (declare) {
    try {
      scope = Object.assign({}, env, declare(env))
    } catch (e) {
      return fail("frontmatter: " + message(e), 2)
    }
  }
  let out = ""
  for (const part of doc.parts) {
    if (part.kind === "text") {
      out += part.value
      continue
    }
    try {
      out += toText(part.fn(scope))
    } catch (e) {
      return fail("{{ " + part.desc + " }}: " + message(e), part.line || 1)
    }
  }
  return JSON.stringify({ out })
})()
`

async function runVm(doc: VmDoc, env: Record<string, unknown>): Promise<string> {
  const QuickJS = await engine()
  const ctx = QuickJS.newContext()
  try {
    const docHandle = ctx.newString(JSON.stringify(doc))
    ctx.setProp(ctx.global, "__jimDoc", docHandle)
    docHandle.dispose()
    const envHandle = ctx.newString(JSON.stringify(env))
    ctx.setProp(ctx.global, "__jimEnv", envHandle)
    envHandle.dispose()
    const result = ctx.evalCode(PROGRAM)
    if (result.error) {
      const dumped = ctx.dump(result.error) as { message?: string } | string
      result.error.dispose()
      const msg =
        typeof dumped === "string" ? dumped : (dumped?.message ?? "eval failed")
      throw new JimSyntaxError(String(msg), 1)
    }
    const raw = ctx.dump(result.value) as string
    result.value.dispose()
    const parsed = JSON.parse(raw) as {
      out?: string
      error?: { message: string; line: number }
    }
    if (parsed.error) {
      throw new JimSyntaxError(parsed.error.message, parsed.error.line)
    }
    return parsed.out ?? ""
  } finally {
    ctx.dispose()
  }
}

export async function validateJim(source: string): Promise<void> {
  const doc = prepare(source)
  await runVm({ ...doc, validateOnly: true }, {})
}

export async function renderJim(
  source: string,
  env: Record<string, unknown>,
): Promise<string> {
  return runVm(prepare(source), env)
}

export class TemplateError extends Error {}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const e = error as { message?: unknown; position?: unknown }
    const msg = typeof e.message === "string" ? e.message : String(e.message)
    return typeof e.position === "number"
      ? `${msg} (position ${e.position})`
      : msg
  }
  return String(error)
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
export async function renderPage(
  source: string,
  data: Record<string, unknown>,
  meta: RenderMeta,
): Promise<string> {
  try {
    const scope: Record<string, unknown> = {
      ...data,
      cube: meta.cube,
      page: meta.page,
      pages: (meta.pages ?? []).filter((p) => p.slug !== meta.page?.slug),
      api: meta.api,
    }
    const out = await renderJim(source, scope)
    return resolveLinks(out, meta.pages ?? [])
  } catch (error) {
    throw new TemplateError(describeError(error))
  }
}
