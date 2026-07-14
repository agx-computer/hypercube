"use client"

import { useState, useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Column, ColumnDef } from "@tanstack/react-table"
import type { TableField } from "@hypercube/core/store"
import { DataTable } from "@/components/data-table"
import { RecordActions } from "@/components/record-actions"
import { FieldSheet } from "@/components/field-sheet"
import { RecordSheet } from "@/components/record-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

type Row = { id: number; data: Record<string, unknown> }

function format(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function ColumnHeader({
  field,
  column,
  onEdit,
  onDelete,
}: {
  field: TableField
  column: Column<Row, unknown>
  onEdit: () => void
  onDelete: () => void
}) {
  const sorted = column.getIsSorted()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="hover:text-foreground -mx-2 flex items-center gap-1.5 px-2"
          />
        }
      >
        <span>{field.name}</span>
        {sorted === "asc" ? (
          <ArrowUpIcon className="size-3" />
        ) : sorted === "desc" ? (
          <ArrowDownIcon className="size-3" />
        ) : (
          <ChevronsUpDownIcon className="size-3 opacity-40" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowUpIcon />
          Sort ascending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ArrowDownIcon />
          Sort descending
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          Edit field
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          Delete field
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function RecordsTable({
  resourceId,
  tableSlug,
  fields,
  rows,
  readOnly = false,
}: {
  resourceId: string
  tableSlug: string
  fields: TableField[]
  rows: Row[]
  readOnly?: boolean
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<TableField | undefined>(undefined)
  const [adding, setAdding] = useState(false)
  const [record, setRecord] = useState<Row | undefined>(undefined)
  const [addingRecord, setAddingRecord] = useState(false)
  const [, startTransition] = useTransition()

  function removeField(name: string) {
    const id = toast.loading("Deleting field…")
    startTransition(async () => {
      await api(
        `/resources/${resourceId}/tables/${tableSlug}/fields/${encodeURIComponent(name)}`,
        { method: "DELETE" },
      )
      toast.dismiss(id)
      await queryClient.invalidateQueries({
        queryKey: ["table", resourceId, tableSlug],
      })
    })
  }

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "id", header: "id" },
    ...fields.map(
      (f): ColumnDef<Row> => ({
        id: f.name,
        accessorFn: (row) => format(row.data[f.name]),
        header: readOnly
          ? f.name
          : ({ column }) => (
              <ColumnHeader
                field={f}
                column={column}
                onEdit={() => setEditing(f)}
                onDelete={() => removeField(f.name)}
              />
            ),
      }),
    ),
    ...(readOnly
      ? []
      : [
          {
            id: "actions",
            header: () => (
              <div className="flex justify-end">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setAdding(true)}
                >
                  <PlusIcon />
                </Button>
              </div>
            ),
            enableSorting: false,
            cell: ({ row }) => (
              <div className="flex justify-end">
                <RecordActions
                  resourceId={resourceId}
                  tableSlug={tableSlug}
                  recordId={row.original.id}
                  onEdit={() => setRecord(row.original)}
                />
              </div>
            ),
          } satisfies ColumnDef<Row>,
        ]),
  ]

  return (
    <>
      {fields.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 border border-dashed py-20">
          <p className="text-muted-foreground text-sm">
            This table has no fields yet.
          </p>
          {readOnly ? null : (
            <Button onClick={() => setAdding(true)}>
              <PlusIcon />
              Add field
            </Button>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          filterKey="*"
          filterPlaceholder="Search records..."
          empty="No records yet."
          action={
            readOnly ? undefined : (
              <Button size="sm" onClick={() => setAddingRecord(true)}>
                <PlusIcon />
                Add record
              </Button>
            )
          }
          disableHeaderSort
          grid
          selectable
        />
      )}
      {readOnly ? null : (
        <>
          {editing ? (
            <FieldSheet
              resourceId={resourceId}
              tableSlug={tableSlug}
              field={editing}
              open={true}
              onOpenChange={(o) => !o && setEditing(undefined)}
            />
          ) : null}
          <FieldSheet
            resourceId={resourceId}
            tableSlug={tableSlug}
            open={adding}
            onOpenChange={setAdding}
          />
          {record ? (
            <RecordSheet
              resourceId={resourceId}
              tableSlug={tableSlug}
              fields={fields}
              record={record}
              open={true}
              onOpenChange={(o) => !o && setRecord(undefined)}
            />
          ) : null}
          <RecordSheet
            resourceId={resourceId}
            tableSlug={tableSlug}
            fields={fields}
            open={addingRecord}
            onOpenChange={setAddingRecord}
          />
        </>
      )}
    </>
  )
}
