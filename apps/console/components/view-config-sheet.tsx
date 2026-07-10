"use client"

import type {
  ResourceField,
  FilterOp,
  ViewConfig,
} from "@hypercube/core/store"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PlusIcon, XIcon } from "lucide-react"

const OPS: { value: FilterOp; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
]

export interface ConfigState {
  selected: Record<string, boolean>
  labels: Record<string, string>
  filters: ViewConfig["filters"]
  sortField: string
  sortDir: "asc" | "desc"
  pageSize: number
}

export function ViewConfigSheet({
  open,
  onOpenChange,
  fields,
  state,
  setState,
  onSave,
  busy,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  fields: ResourceField[]
  state: ConfigState
  setState: (updater: (s: ConfigState) => ConfigState) => void
  onSave: () => void
  busy: boolean
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:!max-w-lg">
        <SheetHeader>
          <SheetTitle>Configure view</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Fields</h3>
            {fields.map((f) => (
              <div key={f.name} className="flex items-center gap-2">
                <Checkbox
                  checked={state.selected[f.name] ?? false}
                  onCheckedChange={(v) =>
                    setState((s) => ({
                      ...s,
                      selected: { ...s.selected, [f.name]: v === true },
                    }))
                  }
                />
                <code className="bg-muted w-28 shrink-0 px-1.5 py-0.5 text-xs">
                  {f.name}
                </code>
                <Input
                  placeholder="rename"
                  value={state.labels[f.name] ?? ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      labels: { ...s.labels, [f.name]: e.target.value },
                    }))
                  }
                  disabled={!state.selected[f.name]}
                />
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Filters</h3>
            {state.filters.map((flt, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={flt.field}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      filters: s.filters.map((x, j) =>
                        j === i ? { ...x, field: e.target.value } : x,
                      ),
                    }))
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
                    setState((s) => ({
                      ...s,
                      filters: s.filters.map((x, j) =>
                        j === i
                          ? { ...x, op: e.target.value as FilterOp }
                          : x,
                      ),
                    }))
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
                    setState((s) => ({
                      ...s,
                      filters: s.filters.map((x, j) =>
                        j === i ? { ...x, value: e.target.value } : x,
                      ),
                    }))
                  }
                  placeholder="value"
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      filters: s.filters.filter((_, j) => j !== i),
                    }))
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
                  setState((s) => ({
                    ...s,
                    filters: [
                      ...s.filters,
                      { field: fields[0]?.name ?? "", op: "eq", value: "" },
                    ],
                  }))
                }
              >
                <PlusIcon />
                Add filter
              </Button>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Sort</h3>
            <div className="flex items-center gap-2">
              <select
                value={state.sortField}
                onChange={(e) =>
                  setState((s) => ({ ...s, sortField: e.target.value }))
                }
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
                value={state.sortDir}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    sortDir: e.target.value as "asc" | "desc",
                  }))
                }
                className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
                disabled={!state.sortField}
              >
                <option value="asc">ascending</option>
                <option value="desc">descending</option>
              </select>
            </div>
          </section>

        </div>
        <SheetFooter>
          <Button onClick={onSave} disabled={busy}>
            Save view
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
