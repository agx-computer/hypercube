"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { applyView, renderIndex, renderList, renderItem } from "@hypercube/core/view"
import type {
  Block,
  CubeField,
  ViewConfig,
  ViewTemplate,
} from "@hypercube/core/store"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BlockEditor, type BlockWithId } from "@/components/block-editor"
import { ViewConfigSheet, type ConfigState } from "@/components/view-config-sheet"
import { saveViewAction } from "@/lib/actions"
import { SlidersHorizontalIcon } from "lucide-react"

let idc = 0
const withId = (b: Block): BlockWithId => ({ ...b, _id: `b${idc++}` })

interface PageState {
  mode: "blocks" | "handlebars"
  blocks: BlockWithId[]
  source: string
}

function initPage(
  t: ViewTemplate | undefined,
  fallback: Block[],
): PageState {
  if (t?.mode === "handlebars") {
    return { mode: "handlebars", blocks: [], source: t.source }
  }
  if (t?.mode === "blocks") {
    return { mode: "blocks", blocks: t.blocks.map(withId), source: "" }
  }
  return { mode: "blocks", blocks: fallback.map(withId), source: "" }
}

function toTemplate(p: PageState): ViewTemplate {
  return p.mode === "handlebars"
    ? { mode: "handlebars", source: p.source }
    : { mode: "blocks", blocks: p.blocks.map(({ _id, ...b }) => b as Block) }
}

export function ViewWorkspace({
  cubeSlug,
  cubeName,
  viewSlug,
  viewName,
  fields,
  rows,
  initial,
}: {
  cubeSlug: string
  cubeName: string
  viewSlug: string
  viewName: string
  fields: CubeField[]
  rows: Record<string, unknown>[]
  initial: ViewConfig
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)

  const [state, setState] = useState<ConfigState>(() => {
    const selected: Record<string, boolean> = {}
    if (initial.fields.length === 0) fields.forEach((f) => (selected[f.name] = true))
    else initial.fields.forEach((s) => (selected[s.field] = true))
    const labels: Record<string, string> = {}
    initial.fields.forEach((s) => {
      if (s.label) labels[s.field] = s.label
    })
    return {
      selected,
      labels,
      filters: initial.filters ?? [],
      sortField: initial.sort?.field ?? "",
      sortDir: initial.sort?.dir ?? "asc",
      pageSize: initial.pageSize ?? 25,
    }
  })

  const fieldNames = useMemo(
    () =>
      Object.keys(state.selected).filter((k) => state.selected[k]).length > 0
        ? fields
            .filter((f) => state.selected[f.name])
            .map((f) => state.labels[f.name]?.trim() || f.name)
        : fields.map((f) => f.name),
    [state.selected, state.labels, fields],
  )

  const first = fieldNames[0] ?? "id"
  const listDefault: Block[] = [
    { type: "heading", level: 1, text: "{{view.name}}" },
    { type: "list", ordered: false, item: `[{{${first}}}]({{_link}})` },
  ]
  const itemDefault: Block[] = [
    { type: "heading", level: 1, text: `{{${first}}}` },
    { type: "fields", fields: fieldNames },
  ]
  const indexDefault: Block[] = [
    { type: "heading", level: 1, text: "{{view.name}}" },
    { type: "text", text: "{{extra.total}} records in this view." },
    { type: "heading", level: 2, text: "API" },
    {
      type: "text",
      text: "- List: `GET {{api.list}}?page=1`\n- Item: `GET {{api.item}}/{id}`",
    },
  ]

  const [indexPage, setIndexPage] = useState<PageState>(() =>
    initPage(initial.index, indexDefault),
  )
  const [listPage, setListPage] = useState<PageState>(() =>
    initPage(initial.list ?? initial.template, listDefault),
  )
  const [itemPage, setItemPage] = useState<PageState>(() =>
    initPage(initial.item, itemDefault),
  )

  const config: ViewConfig = useMemo(
    () => ({
      fields: fields
        .filter((f) => state.selected[f.name])
        .map((f) => ({
          field: f.name,
          ...(state.labels[f.name]?.trim()
            ? { label: state.labels[f.name].trim() }
            : {}),
        })),
      filters: state.filters,
      ...(state.sortField
        ? { sort: { field: state.sortField, dir: state.sortDir } }
        : {}),
      pageSize: state.pageSize,
      index: toTemplate(indexPage),
      list: toTemplate(listPage),
      item: toTemplate(itemPage),
    }),
    [fields, state, indexPage, listPage, itemPage],
  )

  const transformed = useMemo(() => applyView(rows, config), [rows, config])
  const meta = {
    cube: { name: cubeName, slug: cubeSlug },
    view: { name: viewName, slug: viewSlug },
  }

  const pageSize = state.pageSize || 25
  const total = transformed.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const apiBase = `/api/c/${cubeSlug}/views/${viewSlug}`
  const indexMeta = {
    ...meta,
    api: { index: apiBase, list: `${apiBase}/list`, item: apiBase },
  }
  const lastIndex = useRef("")
  const indexMd = useMemo(() => {
    try {
      const text = renderIndex(config, indexMeta, { total, pages, pageSize })
      lastIndex.current = text
      return { valid: true, text }
    } catch {
      return { valid: false, text: lastIndex.current }
    }
  }, [config, total, pages, pageSize, cubeSlug, viewSlug, cubeName, viewName])

  const lastList = useRef("")
  const listResult = useMemo(() => {
    try {
      const r = renderList(transformed, config, meta, { page })
      lastList.current = r.markdown
      return { valid: true, ...r }
    } catch {
      return { valid: false, markdown: lastList.current, page: 1, pages: 1, total: 0 }
    }
  }, [transformed, config, page, cubeName, cubeSlug, viewName, viewSlug])

  const lastItem = useRef("")
  const itemMd = useMemo(() => {
    try {
      const sample = transformed[0]
      if (!sample) return { valid: true, text: "_No records to preview._" }
      const text = renderItem(sample, config, meta)
      lastItem.current = text
      return { valid: true, text }
    } catch {
      return { valid: false, text: lastItem.current }
    }
  }, [transformed, config, cubeName, cubeSlug, viewName, viewSlug])

  const cols = transformed[0]
    ? Object.keys(transformed[0]).filter((c) => !c.startsWith("_"))
    : []

  async function save() {
    setBusy(true)
    await saveViewAction(cubeSlug, viewSlug, config)
    setBusy(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Tabs defaultValue="index" className="flex flex-1 flex-col">
        <div className="bg-muted/40 flex items-center justify-between border-b px-3 py-2">
          <TabsList>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="index">Index page</TabsTrigger>
            <TabsTrigger value="list">List page</TabsTrigger>
            <TabsTrigger value="item">Item page</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={busy}>
              Save view
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <SlidersHorizontalIcon />
              Data
            </Button>
          </div>
        </div>

        <TabsContent value="data" className="flex-1 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c) => (
                  <TableHead key={c} className="h-9">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transformed.length ? (
                transformed.map((row, i) => (
                  <TableRow key={i}>
                    {cols.map((c) => (
                      <TableCell key={c} className="h-10 py-0">
                        {String(row[c] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={Math.max(1, cols.length)}
                    className="text-muted-foreground h-20 text-center"
                  >
                    No rows.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="index" className="flex flex-1 flex-col">
          <PageEditor
            page={indexPage}
            setPage={setIndexPage}
            fieldNames={fieldNames}
            preview={indexMd.text}
            valid={indexMd.valid}
            footer="Entry page — how agents learn to use this view"
          />
        </TabsContent>

        <TabsContent value="list" className="flex flex-1 flex-col">
          <PageEditor
            page={listPage}
            setPage={setListPage}
            fieldNames={[...fieldNames, "_link"]}
            preview={listResult.markdown}
            valid={listResult.valid}
            footer={`Page ${listResult.page} of ${listResult.pages} · ${listResult.total} records`}
          />
        </TabsContent>

        <TabsContent value="item" className="flex flex-1 flex-col">
          <PageEditor
            page={itemPage}
            setPage={setItemPage}
            fieldNames={fieldNames}
            preview={itemMd.text}
            valid={itemMd.valid}
            footer="Preview of the first record"
          />
        </TabsContent>
      </Tabs>

      <ViewConfigSheet
        open={open}
        onOpenChange={setOpen}
        fields={fields}
        state={state}
        setState={setState}
        onSave={save}
        busy={busy}
      />
    </>
  )
}

function PageEditor({
  page,
  setPage,
  fieldNames,
  preview,
  valid,
  footer,
}: {
  page: PageState
  setPage: (updater: (p: PageState) => PageState) => void
  fieldNames: string[]
  preview: string
  valid: boolean
  footer: string
}) {
  return (
    <>
      <div className="flex items-center justify-start border-b px-3 py-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setPage((p) => ({
              ...p,
              mode: p.mode === "blocks" ? "handlebars" : "blocks",
            }))
          }
        >
          {page.mode === "blocks" ? "Edit as code" : "Back to blocks"}
        </Button>
      </div>
      <div className="grid flex-1 md:grid-cols-2">
        <div className="overflow-auto border-r p-4">
          {page.mode === "blocks" ? (
            <BlockEditor
              blocks={page.blocks}
              fieldNames={fieldNames}
              onChange={(blocks) => setPage((p) => ({ ...p, blocks }))}
            />
          ) : (
            <textarea
              value={page.source}
              onChange={(e) =>
                setPage((p) => ({ ...p, source: e.target.value }))
              }
              placeholder={"# {{view.name}}\n\n{{#each records}}\n- {{title}}\n{{/each}}"}
              spellCheck={false}
              className="min-h-96 w-full resize-none bg-transparent font-mono text-xs outline-none"
            />
          )}
        </div>
        <div className="relative overflow-auto">
          {!valid ? (
            <div className="text-muted-foreground bg-muted/60 absolute top-2 right-2 px-2 py-0.5 text-xs">
              Unsaved syntax error
            </div>
          ) : null}
          <pre className="p-4 text-xs whitespace-pre-wrap">{preview}</pre>
          <div className="text-muted-foreground border-t px-4 py-2 text-xs">
            {footer}
          </div>
        </div>
      </div>
    </>
  )
}
