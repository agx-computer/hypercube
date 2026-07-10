"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { applyTransform, renderCube } from "@hypercube/core/view"
import type { Block, PageTemplate } from "@hypercube/core/store"
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
import { saveCubeAction } from "@/lib/actions"

let idc = 0
const withId = (b: Block): BlockWithId => ({ ...b, _id: `b${idc++}` })

function initTemplate(t: PageTemplate | null): {
  mode: "blocks" | "handlebars"
  blocks: BlockWithId[]
  source: string
} {
  if (t?.mode === "handlebars")
    return { mode: "handlebars", blocks: [], source: t.source }
  if (t?.mode === "blocks")
    return { mode: "blocks", blocks: t.blocks.map(withId), source: "" }
  return { mode: "blocks", blocks: [], source: "" }
}

export function CubeEditor({
  cubeSlug,
  cubeName,
  viewedRows,
  transform: initialTransform,
  template: initialTemplate,
}: {
  cubeSlug: string
  cubeName: string
  viewedRows: Record<string, unknown>[]
  transform: string
  template: PageTemplate | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [transform, setTransform] = useState(initialTransform)

  const tpl = useMemo(() => initTemplate(initialTemplate), [])
  const [mode, setMode] = useState(tpl.mode)
  const [blocks, setBlocks] = useState<BlockWithId[]>(tpl.blocks)
  const [source, setSource] = useState(tpl.source)

  // JSONata transform applied to viewed rows (async), debounced.
  const [rows, setRows] = useState<Record<string, unknown>[]>(viewedRows)
  const [transformError, setTransformError] = useState("")
  const lastRows = useRef<Record<string, unknown>[]>(viewedRows)
  useEffect(() => {
    const id = setTimeout(() => {
      applyTransform(viewedRows, transform)
        .then((r) => {
          lastRows.current = r
          setRows(r)
          setTransformError("")
        })
        .catch((e) => setTransformError(e.message ?? "transform error"))
    }, 400)
    return () => clearTimeout(id)
  }, [transform, viewedRows])

  const template: PageTemplate = useMemo(
    () =>
      mode === "handlebars"
        ? { mode: "handlebars", source }
        : { mode: "blocks", blocks: blocks.map(({ _id, ...b }) => b as Block) },
    [mode, source, blocks],
  )

  const fieldNames = rows[0]
    ? Object.keys(rows[0]).filter((c) => !c.startsWith("_"))
    : []

  const meta = {
    cube: { name: cubeName, slug: cubeSlug },
    view: { name: cubeName, slug: cubeSlug },
    api: { self: `/c/${cubeSlug}` },
  }
  const lastMd = useRef("")
  const rendered = useMemo(() => {
    try {
      const text = renderCube(rows, template, meta)
      lastMd.current = text
      return { valid: true, text }
    } catch {
      return { valid: false, text: lastMd.current }
    }
  }, [rows, template, cubeSlug, cubeName])

  const cols = rows[0]
    ? Object.keys(rows[0]).filter((c) => !c.startsWith("_"))
    : []

  async function save() {
    setBusy(true)
    await saveCubeAction(cubeSlug, { transform, template })
    setBusy(false)
    router.refresh()
  }

  return (
    <Tabs defaultValue="markdown" className="flex flex-1 flex-col">
      <div className="bg-muted/40 flex items-center justify-between border-b px-3 py-2">
        <TabsList>
          <TabsTrigger value="transform">Transform</TabsTrigger>
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
        </TabsList>
        <Button size="sm" onClick={save} disabled={busy}>
          Save
        </Button>
      </div>

      <TabsContent value="transform" className="flex flex-1 flex-col">
        <div className="text-muted-foreground border-b px-3 py-1.5 text-xs">
          JSONata expression. Input is the view&apos;s rows. Leave empty to pass
          through. Examples: <code>$[amount &gt; 100]</code>,{" "}
          <code>{"{ \"total\": $sum(amount) }"}</code>
        </div>
        <div className="grid flex-1 md:grid-cols-2">
          <textarea
            value={transform}
            onChange={(e) => setTransform(e.target.value)}
            placeholder="$  (passthrough)"
            spellCheck={false}
            className="min-h-96 resize-none border-r bg-transparent p-4 font-mono text-xs outline-none"
          />
          <div className="relative overflow-auto">
            {transformError ? (
              <div className="text-destructive p-4 text-xs">
                {transformError}
              </div>
            ) : (
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
                  {rows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      {cols.map((c) => (
                        <TableCell key={c} className="h-10 py-0">
                          {typeof row[c] === "object"
                            ? JSON.stringify(row[c])
                            : String(row[c] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="markdown" className="flex flex-1 flex-col">
        <div className="flex items-center justify-start border-b px-3 py-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setMode((m) => (m === "blocks" ? "handlebars" : "blocks"))
            }
          >
            {mode === "blocks" ? "Edit as code" : "Back to blocks"}
          </Button>
        </div>
        <div className="grid flex-1 md:grid-cols-2">
          <div className="overflow-auto border-r p-4">
            {mode === "blocks" ? (
              <BlockEditor
                blocks={blocks}
                fieldNames={fieldNames}
                onChange={setBlocks}
              />
            ) : (
              <textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                spellCheck={false}
                className="min-h-96 w-full resize-none bg-transparent font-mono text-xs outline-none"
              />
            )}
          </div>
          <div className="relative overflow-auto">
            {!rendered.valid ? (
              <div className="text-muted-foreground bg-muted/60 absolute top-2 right-2 px-2 py-0.5 text-xs">
                Unsaved syntax error
              </div>
            ) : null}
            <pre className="p-4 text-xs whitespace-pre-wrap">
              {rendered.text}
            </pre>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
