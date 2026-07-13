"use client"

import { useState } from "react"
import type { ResourceHint, TableHint } from "@/components/code-editor"
import { cn } from "@/lib/utils"
import { ChevronRightIcon, DatabaseIcon } from "lucide-react"

function formatSample(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function TableNode({
  resource,
  table,
  onInsert,
}: {
  resource: ResourceHint
  table: TableHint
  onInsert: (text: string, expression: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const reference = `resources["${resource.name}"]["${table.name}"]`

  return (
    <div className="flex flex-col">
      <div className="group flex h-7 items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="hover:text-foreground flex min-w-0 items-center gap-1"
        >
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-3 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="truncate font-mono text-xs font-medium">
            {table.name}
          </span>
        </button>
        <span className="text-muted-foreground/70 text-[10px]">
          {table.fields.length}
        </span>
        <button
          type="button"
          onClick={() => onInsert(reference, true)}
          className="text-muted-foreground hover:text-foreground ml-auto text-[10px] font-medium opacity-0 group-hover:opacity-100"
        >
          Insert
        </button>
      </div>
      {open ? (
        <div className="mb-1 ml-[5px] flex flex-col border-l pl-2.5">
          {table.fields.length === 0 ? (
            <div className="text-muted-foreground py-0.5 text-xs">
              No fields.
            </div>
          ) : (
            table.fields.map((field) => (
              <button
                key={field.name}
                type="button"
                onClick={() => onInsert(field.name, false)}
                className="hover:bg-muted/60 -mx-1 flex items-baseline gap-2 rounded px-1 py-0.5 text-left"
              >
                <span className="shrink-0 font-mono text-xs">{field.name}</span>
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  {field.type}
                </span>
                <span className="text-muted-foreground/70 ml-auto min-w-0 truncate text-right font-mono text-[10px]">
                  {formatSample(table.sample?.[field.name])}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

export function DataPanel({
  resources,
  onInsert,
}: {
  resources: ResourceHint[]
  onInsert: (text: string, expression: boolean) => void
}) {
  if (resources.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No resources yet. Connect one to reference its data here.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {resources.map((resource) => (
        <div key={resource.uuid} className="flex flex-col gap-1">
          <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase">
            <DatabaseIcon className="size-3" />
            <span className="truncate">{resource.name}</span>
          </div>
          {resource.tables.length === 0 ? (
            <div className="text-muted-foreground pl-[18px] text-xs">
              No tables.
            </div>
          ) : (
            resource.tables.map((table) => (
              <TableNode
                key={table.slug}
                resource={resource}
                table={table}
                onInsert={onInsert}
              />
            ))
          )}
        </div>
      ))}
    </div>
  )
}
