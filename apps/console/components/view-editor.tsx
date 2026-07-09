"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type {
  CubeField,
  FilterOp,
  ViewConfig,
} from "@hypercube/core/store"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { saveViewAction } from "@/lib/actions"
import { PlusIcon, XIcon } from "lucide-react"

const OPS: { value: FilterOp; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
]

export function ViewEditor({
  cubeSlug,
  viewSlug,
  fields,
  initial,
}: {
  cubeSlug: string
  viewSlug: string
  fields: CubeField[]
  initial: ViewConfig
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    if (initial.fields.length === 0) fields.forEach((f) => (m[f.name] = true))
    else initial.fields.forEach((s) => (m[s.field] = true))
    return m
  })
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    initial.fields.forEach((s) => {
      if (s.label) m[s.field] = s.label
    })
    return m
  })
  const [filters, setFilters] = useState(initial.filters ?? [])
  const [sortField, setSortField] = useState(initial.sort?.field ?? "")
  const [sortDir, setSortDir] = useState(initial.sort?.dir ?? "asc")

  async function save() {
    setBusy(true)
    const config: ViewConfig = {
      fields: fields
        .filter((f) => selected[f.name])
        .map((f) => ({
          field: f.name,
          ...(labels[f.name]?.trim() ? { label: labels[f.name].trim() } : {}),
        })),
      filters,
      ...(sortField ? { sort: { field: sortField, dir: sortDir } } : {}),
    }
    await saveViewAction(cubeSlug, viewSlug, config)
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Fields</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {fields.map((f) => (
            <div key={f.name} className="flex items-center gap-3">
              <Checkbox
                checked={selected[f.name] ?? false}
                onCheckedChange={(v) =>
                  setSelected((s) => ({ ...s, [f.name]: v === true }))
                }
              />
              <code className="bg-muted w-40 px-1.5 py-0.5 text-xs">
                {f.name}
              </code>
              <Input
                placeholder={`rename (default: ${f.name})`}
                value={labels[f.name] ?? ""}
                onChange={(e) =>
                  setLabels((l) => ({ ...l, [f.name]: e.target.value }))
                }
                className="max-w-xs"
                disabled={!selected[f.name]}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {filters.map((flt, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={flt.field}
                onChange={(e) =>
                  setFilters((fs) =>
                    fs.map((x, j) =>
                      j === i ? { ...x, field: e.target.value } : x,
                    ),
                  )
                }
                className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                {fields.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
              <select
                value={flt.op}
                onChange={(e) =>
                  setFilters((fs) =>
                    fs.map((x, j) =>
                      j === i
                        ? { ...x, op: e.target.value as FilterOp }
                        : x,
                    ),
                  )
                }
                className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                {OPS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Input
                value={flt.value}
                onChange={(e) =>
                  setFilters((fs) =>
                    fs.map((x, j) =>
                      j === i ? { ...x, value: e.target.value } : x,
                    ),
                  )
                }
                placeholder="value"
                className="max-w-xs"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  setFilters((fs) => fs.filter((_, j) => j !== i))
                }
              >
                <XIcon />
              </Button>
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setFilters((fs) => [
                  ...fs,
                  { field: fields[0]?.name ?? "", op: "eq", value: "" },
                ])
              }
            >
              <PlusIcon />
              Add filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sort</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="">No sort</option>
            {fields.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
            className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
            disabled={!sortField}
          >
            <option value="asc">ascending</option>
            <option value="desc">descending</option>
          </select>
        </CardContent>
      </Card>

      <div>
        <Button onClick={save} disabled={busy}>
          Save view
        </Button>
      </div>
    </div>
  )
}
