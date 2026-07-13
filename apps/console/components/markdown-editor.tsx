"use client"

import { useEffect, useImperativeHandle, useRef, type Ref } from "react"
import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionContext,
} from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { javascriptLanguage } from "@codemirror/lang-javascript"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
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
import { parseMixed } from "@lezer/common"
import { tags as t } from "@lezer/highlight"
import type { InlineContext, MarkdownConfig } from "@lezer/markdown"
import { findExpressionEnd } from "@hypercube/core/jim"
import {
  completionSource,
  resourceRefRanges,
  variableRefMap,
  type DeclarationHint,
  type ResourceHint,
} from "@/components/code-editor"
import { cn } from "@/lib/utils"

const jimMarkdown: MarkdownConfig = {
  defineNodes: [
    { name: "JimExpression" },
    { name: "JimExpressionMark", style: t.special(t.brace) },
  ],
  parseInline: [
    {
      name: "JimExpression",
      parse(cx: InlineContext, next: number, pos: number): number {
        if (next !== 123 || cx.char(pos + 1) !== 123) return -1
        if (pos > cx.offset && cx.char(pos - 1) === 92) return -1
        const text = cx.slice(pos + 2, cx.end)
        const rel = findExpressionEnd(text, 0)
        if (rel === -1) return -1
        const end = pos + 2 + rel + 2
        return cx.addElement(
          cx.elt("JimExpression", pos, end, [
            cx.elt("JimExpressionMark", pos, pos + 2),
            cx.elt("JimExpressionMark", end - 2, end),
          ]),
        )
      },
    },
  ],
  wrap: parseMixed((node) =>
    node.name === "JimExpression"
      ? {
          parser: javascriptLanguage.parser,
          overlay: [{ from: node.from + 2, to: node.to - 2 }],
        }
      : null,
  ),
}

const highlight = HighlightStyle.define([
  { tag: t.heading, fontWeight: "600" },
  { tag: t.strong, fontWeight: "600" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: [t.link, t.url], color: "#3b82f6" },
  { tag: t.processingInstruction, color: "#9ca3af" },
  { tag: t.special(t.brace), color: "#3b82f6", fontWeight: "600" },
  { tag: t.keyword, color: "#8b5cf6" },
  { tag: [t.string, t.special(t.string)], color: "#16a34a" },
  { tag: [t.number, t.bool, t.null], color: "#d97706" },
  { tag: t.comment, color: "#9ca3af", fontStyle: "italic" },
  { tag: t.propertyName, color: "#0891b2" },
])

function expressionRanges(text: string): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = []
  let i = 0
  while (i < text.length) {
    if (text.startsWith("\\{{", i)) {
      i += 3
      continue
    }
    if (text.startsWith("{{", i)) {
      const end = findExpressionEnd(text, i + 2)
      if (end === -1) break
      ranges.push({ from: i, to: end + 2 })
      i = end + 2
      continue
    }
    i += 1
  }
  return ranges
}

function jimDecorations(resources: ResourceHint[]) {
  const exprMark = Decoration.mark({ class: "cm-jim" })
  const refMark = Decoration.mark({ class: "cm-resource" })

  const build = (view: EditorView): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>()
    const text = view.state.doc.toString()
    for (const range of expressionRanges(text)) {
      builder.add(range.from, range.to, exprMark)
      const inner = text.slice(range.from, range.to)
      for (const ref of resourceRefRanges(inner, resources)) {
        builder.add(range.from + ref.from, range.from + ref.to, refMark)
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

const HOST_SCOPE: Completion[] = [
  { label: "table", type: "function", detail: "markdown table" },
  { label: "cube", type: "variable", detail: "host" },
  { label: "page", type: "variable", detail: "host" },
  { label: "pages", type: "variable", detail: "host" },
  { label: "api", type: "variable", detail: "host" },
]

const theme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "12px",
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily:
      "var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
  },
  ".cm-content": {
    padding: "16px",
    caretColor: "var(--foreground)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-line": { padding: "0" },
  ".cm-jim": {
    backgroundColor:
      "color-mix(in oklab, var(--muted-foreground) 12%, transparent)",
    borderRadius: "3px",
  },
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

export interface MarkdownEditorHandle {
  insert(text: string): void
  insertExpression(code: string): void
}

export function MarkdownEditor({
  ref,
  value,
  onChange,
  resources,
  variables,
  placeholder,
  className,
}: {
  ref?: Ref<MarkdownEditorHandle>
  value: string
  onChange: (value: string) => void
  resources: ResourceHint[]
  variables: DeclarationHint[]
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

  useImperativeHandle(
    ref,
    () => {
      const insertAt = (text: string) => {
        const view = viewRef.current
        if (!view) return
        const { from, to } = view.state.selection.main
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        })
        view.focus()
      }
      return {
        insert: insertAt,
        insertExpression(code: string) {
          const view = viewRef.current
          if (!view) return
          const { from } = view.state.selection.main
          const inside = expressionRanges(view.state.doc.toString()).some(
            (r) => from >= r.from + 2 && from <= r.to - 2,
          )
          insertAt(inside ? code : `{{ ${code} }}`)
        },
      }
    },
    [],
  )

  useEffect(() => {
    if (!containerRef.current) return
    const gated = (context: CompletionContext) => {
      const before = context.state.sliceDoc(0, context.pos)
      const open = before.lastIndexOf("{{")
      if (open === -1 || open < before.lastIndexOf("}}")) return null
      const names = variablesRef.current
        .map((v) => v.name.trim())
        .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name))
      const extras: Completion[] = [
        ...names.map((name) => ({
          label: name,
          type: "variable",
          detail: "variable",
        })),
        ...HOST_SCOPE,
      ]
      const varRefs = variableRefMap(
        variablesRef.current,
        resourcesRef.current,
      )
      return completionSource(
        resourcesRef.current,
        extras,
        varRefs,
        new Set([...names, "pages"]),
      )(context)
    }
    const view = new EditorView({
      doc: valueRef.current,
      parent: containerRef.current,
      extensions: [
        history(),
        drawSelection(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        markdown({ base: markdownLanguage, extensions: [jimMarkdown] }),
        syntaxHighlighting(highlight),
        autocompletion({ override: [gated] }),
        jimDecorations(resourcesRef.current),
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
