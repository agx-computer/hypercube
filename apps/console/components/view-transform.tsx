"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { applyView } from "@hypercube/core/view"
import type { TableField, ViewConfig } from "@hypercube/core/store"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ViewConfigSheet, type ConfigState } from "@/components/view-config-sheet"
import { saveViewAction } from "@/lib/actions"
import { SlidersHorizontalIcon } from "lucide-react"

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export function ViewTransform({
  resourceId,
  tableSlug,
  viewSlug,
  fields,
  rows,
  initial,
}: {
  resourceId: string
  tableSlug: string
  viewSlug: string
  fields: TableField[]
  rows: Record<string, unknown>[]
  initial: ViewConfig
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [state, setState] = useState<ConfigState>(() => {
    const selected: Record<string, boolean> = {}
    if (initial.fields.length === 0)
      fields.forEach((f) => (selected[f.name] = true))
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
    }),
    [fields, state],
  )

  const transformed = useMemo(() => applyView(rows, config), [rows, config])
  const cols = transformed[0]
    ? Object.keys(transformed[0]).filter((c) => !c.startsWith("_"))
    : []

  async function save() {
    setBusy(true)
    await saveViewAction(resourceId, tableSlug, viewSlug, config)
    setBusy(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="bg-muted/40 flex items-center justify-end gap-2 border-b px-3 py-2">
        <Button size="sm" onClick={save} disabled={busy}>
          Save view
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <SlidersHorizontalIcon />
          Configure
        </Button>
      </div>
      <div className="flex-1 overflow-x-auto">
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
                    <TableCell key={c} className="h-10 max-w-32 truncate py-0">
                      {cellText(row[c])}
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
      </div>

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
