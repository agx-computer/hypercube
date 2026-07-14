"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { RecordsTable } from "@/components/records-table"
import { TableTabs } from "@/components/table-tabs"
import { PageError, PageLoading } from "@/components/page-state"
import { useResource, useTable } from "@/lib/queries"
import { PencilIcon } from "lucide-react"

export default function TablePage() {
  const { resourceId, table: tableSlug } = useParams<{
    resourceId: string
    table: string
  }>()
  const resource = useResource(resourceId)
  const table = useTable(resourceId, tableSlug)
  if (resource.error || table.error) {
    return <PageError error={resource.error ?? table.error} />
  }
  if (!resource.data || !table.data) return <PageLoading />
  const readOnly = resource.data.source === "postgres"

  return (
    <>
      <SiteHeader
        title={`${resource.data.name} / ${table.data.name}`}
        action={
          readOnly ? undefined : (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/dashboard/resources/${resourceId}/tables/${tableSlug}/edit`}
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
        resourceId={resourceId}
        tableSlug={tableSlug}
        views={table.data.views}
      />
      <div className="flex flex-1 flex-col">
        <RecordsTable
          resourceId={resourceId}
          tableSlug={tableSlug}
          fields={table.data.fields}
          rows={table.data.records.rows}
          readOnly={readOnly}
        />
      </div>
    </>
  )
}
