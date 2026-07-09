"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Entity } from "@hypercube/core"
import { DataTable } from "@/components/data-table"
import { Checkbox } from "@/components/ui/checkbox"

type Row = { name: string; fields: number; description: string; exposed: boolean }

const columns: ColumnDef<Row>[] = [
  {
    id: "exposed",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <Checkbox
        name="expose"
        value={row.original.name}
        defaultChecked={row.original.exposed}
      />
    ),
  },
  {
    accessorKey: "name",
    header: "Table",
    cell: ({ row }) => (
      <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
        {row.original.name}
      </code>
    ),
  },
  { accessorKey: "fields", header: "Fields" },
  { accessorKey: "description", header: "Description" },
]

export function ExposeTable({
  entities,
  exposed,
}: {
  entities: Entity[]
  exposed: Record<string, unknown>
}) {
  const data: Row[] = entities.map((e) => ({
    name: e.name,
    fields: e.fields.length,
    description: e.description ?? "",
    exposed: e.name in exposed,
  }))
  return (
    <DataTable
      columns={columns}
      data={data}
      filterKey="name"
      filterPlaceholder="Filter tables..."
      empty="No tables found."
    />
  )
}
