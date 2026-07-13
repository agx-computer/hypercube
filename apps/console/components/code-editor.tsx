"use client"

import { useEffect, useRef } from "react"
import {
  autocompletion,
  completionKeymap,
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { RangeSetBuilder } from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view"
import { cn } from "@/lib/utils"

export interface FieldHint {
  name: string
  type: string
}

export interface TableHint {
  slug: string
  name: string
  fields: FieldHint[]
  sample?: Record<string, unknown> | null
}

export interface ResourceHint {
  uuid: string
  name: string
  tables: TableHint[]
}

export interface DeclarationHint {
  name: string
  code: string
}

export interface ResourceRef {
  resource: ResourceHint
  table: TableHint
}

const IDENT = /^[A-Za-z_$][\w$]*$/

const FIRST_SEGMENT =
  /^resources(?:\.([A-Za-z_$][\w$]*)|\[\s*(["'])([^"']*)\2\s*\])/

const ACCESSOR =
  /\bresources\b(?:\.([A-Za-z_$][\w$]*)|\[\s*(["'])([^"']*)\2\s*\])(?:\.([A-Za-z_$][\w$]*)|\[\s*(["'])([^"']*)\5\s*\])?/g

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function resourceMap(resources: ResourceHint[]): Map<string, ResourceHint> {
  return new Map(
    resources.flatMap((r) => [
      [r.uuid, r],
      [r.name, r],
    ]),
  )
}

function tableOf(
  resource: ResourceHint,
  key: string,
): TableHint | undefined {
  return resource.tables.find((t) => t.name === key || t.slug === key)
}

function resolveRef(
  byKey: Map<string, ResourceHint>,
  resourceKey: string | undefined,
  tableKey: string | undefined,
): ResourceRef | null {
  if (resourceKey === undefined || tableKey === undefined) return null
  const resource = byKey.get(resourceKey)
  if (!resource) return null
  const table = tableOf(resource, tableKey)
  return table ? { resource, table } : null
}

export function variableRefMap(
  declarations: DeclarationHint[],
  resources: ResourceHint[],
): Map<string, ResourceRef> {
  const byKey = resourceMap(resources)
  const map = new Map<string, ResourceRef>()
  for (const declaration of declarations) {
    const name = declaration.name.trim()
    if (!IDENT.test(name)) continue
    let ref: ResourceRef | null = null
    for (const m of declaration.code.matchAll(ACCESSOR)) {
      ref = resolveRef(byKey, m[1] ?? m[3], m[4] ?? m[6]) ?? ref
    }
    if (ref) map.set(name, ref)
  }
  return map
}

/** Ranges of resources[...] references, extended as far as they resolve. */
export function resourceRefRanges(
  text: string,
  resources: ResourceHint[],
): { from: number; to: number }[] {
  const byKey = resourceMap(resources)
  const ranges: { from: number; to: number }[] = []
  for (const m of text.matchAll(ACCESSOR)) {
    const start = m.index ?? 0
    const resource = byKey.get(m[1] ?? m[3])
    let end = start + "resources".length
    if (resource) {
      const head = FIRST_SEGMENT.exec(m[0])
      if (head) {
        end = start + head[0].length
        const tableKey = m[4] ?? m[6]
        if (tableKey !== undefined && tableOf(resource, tableKey)) {
          end = start + m[0].length
        }
      }
    }
    ranges.push({ from: start, to: end })
  }
  return ranges
}

function bracketApply(anchor: number, insert: string) {
  return (
    view: EditorView,
    _completion: unknown,
    _from: number,
    to: number,
  ) => {
    view.dispatch({
      changes: { from: anchor, to, insert },
      selection: { anchor: anchor + insert.length },
    })
  }
}

const ROW_METHODS: Completion[] = [
  ...["filter", "map", "find", "sort", "slice", "some", "every", "reduce"].map(
    (method) =>
      snippetCompletion(`${method}(\${})`, {
        label: method,
        type: "method",
        detail: "rows",
      }),
  ),
  { label: "length", type: "property", detail: "number" },
]

export function completionSource(
  resources: ResourceHint[],
  extras: Completion[] = [],
  varRefs?: Map<string, ResourceRef>,
  varNames?: Set<string>,
) {
  const byKey = resourceMap(resources)
  return (context: CompletionContext): CompletionResult | null => {
    const tableSeg = context.matchBefore(
      /resources(?:\.[A-Za-z_$][\w$]*|\[\s*(["'])[^"']*\1\s*\])(?:\[\s*["']?[^"'\]]*|\.[\w$]*)/,
    )
    if (tableSeg) {
      const head = FIRST_SEGMENT.exec(tableSeg.text)
      const resource = head ? byKey.get(head[1] ?? head[3]) : undefined
      if (head && resource) {
        const anchor = tableSeg.from + head[0].length
        const rest = tableSeg.text.slice(head[0].length)
        const options = resource.tables.map((t) => ({
          label: t.name,
          type: "property",
          detail: "table",
          apply: bracketApply(anchor, `["${t.name}"]`),
        }))
        if (rest.startsWith("[")) {
          const quote = /["']/.test(rest.slice(1, 2)) ? 1 : 0
          return { from: anchor + 1 + quote, options }
        }
        return { from: anchor + 1, options, validFor: /^[\w$]*$/ }
      }
    }
    const bracket = context.matchBefore(/resources\[\s*["']?[^"'\]]*/)
    if (bracket) {
      const open = bracket.text.indexOf("[")
      const quote = /["']/.test(bracket.text.slice(open + 1, open + 2)) ? 1 : 0
      return {
        from: bracket.from + open + 1 + quote,
        options: resources.map((r) => ({
          label: r.name,
          type: "property",
          detail: "resource",
          apply: bracketApply(bracket.from + open, `["${r.name}"]`),
        })),
      }
    }
    const dot = context.matchBefore(/resources\.[\w-]*/)
    if (dot) {
      const dotStart = dot.from + "resources".length
      return {
        from: dot.from + "resources.".length,
        options: resources.map((r) => ({
          label: r.name,
          type: "property",
          detail: "resource",
          apply: bracketApply(dotStart, `["${r.name}"]`),
        })),
      }
    }
    const chain = context.matchBefore(/[\])]\s*\.[\w$]*/)
    if (chain) {
      const dotIndex = chain.text.lastIndexOf(".")
      return {
        from: chain.from + dotIndex + 1,
        options: ROW_METHODS,
        validFor: /^[\w$]*$/,
      }
    }
    const prop = context.matchBefore(/[A-Za-z_$][\w$]*\.[\w$]*/)
    if (prop) {
      const dotIndex0 = prop.text.indexOf(".")
      const ident = prop.text.slice(0, dotIndex0)
      const before = context.state.sliceDoc(0, prop.from)
      let ref: ResourceRef | null = varRefs?.get(ident) ?? null
      if (!ref) {
        let best = -1
        for (const m of before.matchAll(ACCESSOR)) {
          const candidate = resolveRef(byKey, m[1] ?? m[3], m[4] ?? m[6])
          if (candidate && (m.index ?? -1) > best) {
            best = m.index ?? -1
            ref = candidate
          }
        }
        if (varRefs && varRefs.size > 0) {
          const namePattern = new RegExp(
            `\\b(${[...varRefs.keys()].map(escapeRegExp).join("|")})\\b`,
            "g",
          )
          for (const m of before.matchAll(namePattern)) {
            if ((m.index ?? -1) > best) {
              best = m.index ?? -1
              ref = varRefs.get(m[1]) ?? ref
            }
          }
        }
      }
      const isKnownVar = varNames?.has(ident) === true
      if (!ref && !isKnownVar) return null
      const fields = ref?.table.fields ?? []
      const dotStart = prop.from + dotIndex0
      return {
        from: dotStart + 1,
        options: [
          ...fields.map((field) =>
            IDENT.test(field.name)
              ? { label: field.name, type: "property", detail: field.type }
              : {
                  label: field.name,
                  type: "property",
                  detail: field.type,
                  apply: bracketApply(dotStart, `["${field.name}"]`),
                },
          ),
          ...ROW_METHODS,
        ],
        validFor: /^[\w$]*$/,
      }
    }
    const word = context.matchBefore(/[A-Za-z_$][\w$]*/)
    if (!word && !context.explicit) return null
    return {
      from: word ? word.from : context.pos,
      options: [
        { label: "resources", type: "variable", detail: "instance data" },
        ...extras,
      ],
      validFor: /^[\w$]*$/,
    }
  }
}

function resourceHighlighter(resources: ResourceHint[]) {
  const mark = Decoration.mark({ class: "cm-resource" })

  const build = (view: EditorView): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>()
    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to)
      for (const range of resourceRefRanges(text, resources)) {
        builder.add(from + range.from, from + range.to, mark)
      }
    }
    return builder.finish()
  }

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = build(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = build(update.view)
        }
      }
    },
    { decorations: (v) => v.decorations },
  )
}

const theme = EditorView.theme({
  "&": {
    fontSize: "12px",
    backgroundColor: "transparent",
  },
  ".cm-content": {
    fontFamily:
      "var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
    padding: "10px 12px",
    minHeight: "88px",
    caretColor: "var(--foreground)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-line": { padding: "0" },
  ".cm-resource": { color: "#3b82f6", fontWeight: "500" },
  ".cm-tooltip": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
})

export function CodeEditor({
  value,
  onChange,
  resources,
  variables = [],
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  resources: ResourceHint[]
  variables?: DeclarationHint[]
  placeholder?: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const valueRef = useRef(value)
  valueRef.current = value
  const resourcesRef = useRef(resources)
  resourcesRef.current = resources
  const variablesRef = useRef(variables)
  variablesRef.current = variables

  const resourcesKey = JSON.stringify(resources)

  useEffect(() => {
    if (!containerRef.current) return
    const source = (context: CompletionContext): CompletionResult | null => {
      const names = variablesRef.current
        .map((v) => v.name.trim())
        .filter((n) => IDENT.test(n))
      const extras: Completion[] = names.map((n) => ({
        label: n,
        type: "variable",
        detail: "variable",
      }))
      const varRefs = variableRefMap(
        variablesRef.current,
        resourcesRef.current,
      )
      return completionSource(
        resourcesRef.current,
        extras,
        varRefs,
        new Set(names),
      )(context)
    }
    const view = new EditorView({
      doc: valueRef.current,
      parent: containerRef.current,
      extensions: [
        history(),
        drawSelection(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        autocompletion({ override: [source] }),
        resourceHighlighter(resourcesRef.current),
        cmPlaceholder(placeholder ?? ""),
        EditorView.lineWrapping,
        theme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
      ],
    })
    viewRef.current = view
    return () => {
      viewRef.current = null
      view.destroy()
    }
  }, [resourcesKey, placeholder])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    }
  }, [value])

  return <div ref={containerRef} className={cn("w-full text-xs", className)} />
}
