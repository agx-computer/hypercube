"use client"

import { useRouter } from "next/navigation"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ArrowUpDownIcon, SearchIcon } from "lucide-react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterKey?: string
  filterPlaceholder?: string
  empty?: string
  action?: React.ReactNode
  rowHref?: (row: TData) => string
  disableHeaderSort?: boolean
  grid?: boolean
  selectable?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterKey,
  filterPlaceholder = "Filter...",
  empty = "No rows.",
  action,
  rowHref,
  disableHeaderSort,
  grid,
  selectable,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [filter, setFilter] = useState("")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const allColumns: ColumnDef<TData, TValue>[] = selectable
    ? [
        {
          id: "__select",
          enableSorting: false,
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
              onCheckedChange={(v) =>
                table.toggleAllPageRowsSelected(v === true)
              }
              aria-label="Select all"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(v === true)}
              aria-label="Select row"
            />
          ),
        } as ColumnDef<TData, TValue>,
        ...columns,
      ]
    : columns

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter: filter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const toolbar =
    filterKey || action ? (
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          grid && "bg-muted/40 border-b px-3 py-2",
        )}
      >
        {filterKey ? (
          <div className="relative max-w-xs flex-1">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={filterPlaceholder}
              className={cn(
                "h-8 pl-8",
                grid && "border-b-transparent focus-visible:border-b-transparent",
              )}
            />
          </div>
        ) : (
          <span />
        )}
        {action}
      </div>
    ) : null

  const body = (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  grid && "h-9",
                  header.column.id === "__select" && "w-10",
                )}
              >
                {header.isPlaceholder
                  ? null
                  : !disableHeaderSort && header.column.getCanSort()
                    ? (
                        <button
                          type="button"
                          className="hover:text-foreground flex items-center gap-1"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDownIcon className="size-3 opacity-50" />
                        </button>
                      )
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => {
            const href = rowHref?.(row.original)
            return (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(href && "cursor-pointer")}
                onClick={href ? () => router.push(href) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "max-w-32 truncate",
                      grid && "h-10 py-0",
                      cell.column.id === "__select" && "w-10",
                    )}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            )
          })
        ) : (
          <TableRow>
            <TableCell
              colSpan={allColumns.length}
              className="text-muted-foreground h-20 text-center"
            >
              {empty}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  const pager =
    table.getPageCount() > 1 ? (
      <div
        className={cn(
          "flex items-center justify-end gap-2",
          grid && "border-t px-3 py-2",
        )}
      >
        <span className="text-muted-foreground text-sm">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    ) : null

  if (grid) {
    return (
      <div className="flex flex-col">
        {toolbar}
        <div className="overflow-x-auto">{body}</div>
        {pager}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {toolbar}
      <div className="border">{body}</div>
      {pager}
    </div>
  )
}
