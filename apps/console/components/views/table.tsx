"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { RecordsTable } from "@/components/records-table"
import { TableTabs } from "@/components/table-tabs"
import { ViewFallback } from "@/components/views/fallback"
import type { TableData } from "@/lib/api-types"
import { useData } from "@/lib/data"
import { PencilIcon } from "lucide-react"

export function TableView() {
  const { resourceId, table: tableSlug } = useParams<{
    resourceId: string
    table: string
  }>()
  const { data, error } = useData<TableData>(
    `/api/resources/${encodeURIComponent(resourceId)}/tables/${encodeURIComponent(tableSlug)}`,
  )
  if (!data) return <ViewFallback error={error} />
  const { resource, table, views, rows } = data
  const readOnly = resource.source === "postgres"
  return (
    <>
      <SiteHeader
        title={`${resource.name} / ${table.name}`}
        action={
          readOnly ? undefined : (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/dashboard/resources/${resource.uuid}/tables/${table.slug}/edit`}
                />
              }
            >
              <PencilIcon />
              Edit
            </Button>
          )
        }
      />
      <TableTabs
        resourceId={resource.uuid}
        tableSlug={table.slug}
        views={views}
      />
      <div className="flex flex-1 flex-col">
        <RecordsTable
          resourceId={resource.uuid}
          tableSlug={table.slug}
          fields={table.fields}
          rows={rows}
          readOnly={readOnly}
        />
      </div>
    </>
  )
}
