"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { CubeField } from "@hypercube/core/store"
import { PlusIcon, XIcon } from "lucide-react"

function RequiredToggle({ defaultChecked }: { defaultChecked: boolean }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <label className="flex items-center gap-1.5 text-sm">
      <input type="hidden" name="field_required" value={on ? "1" : "0"} />
      <Checkbox
        checked={on}
        onCheckedChange={(v) => setOn(v === true)}
      />
      required
    </label>
  )
}

const TYPES = ["text", "number", "boolean", "date"] as const

type RowState = { key: number; field?: CubeField }

export function FieldRows({ initial }: { initial?: CubeField[] }) {
  const seed: RowState[] = initial?.length
    ? initial.map((f, i) => ({ key: i, field: f }))
    : [{ key: 0 }]
  const [rows, setRows] = useState<RowState[]>(seed)
  const [next, setNext] = useState(seed.length)

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <Input
            name="field_name"
            placeholder="field name"
            className="flex-1"
            defaultValue={row.field?.name ?? ""}
          />
          <select
            name="field_type"
            className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
            defaultValue={row.field?.type ?? "text"}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <RequiredToggle defaultChecked={row.field?.required ?? false} />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setRows((r) => [...r, { key: next }])
            setNext((n) => n + 1)
          }}
        >
          <PlusIcon />
          Add field
        </Button>
      </div>
    </div>
  )
}
