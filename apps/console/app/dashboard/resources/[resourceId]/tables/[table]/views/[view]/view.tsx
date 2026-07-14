"use client"

import { useParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { TableTabs } from "@/components/table-tabs"
import { ViewTransform } from "@/components/view-transform"
import { DeleteView } from "@/components/delete-view"
import { PageError, PageLoading } from "@/components/page-state"
import { useResource, useTable, useTableView } from "@/lib/queries"

export default function TableViewPage() {
  const {
    resourceId,
    table: tableSlug,
    view: viewSlug,
  } = useParams<{ resourceId: string; table: string; view: string }>()
  const resource = useResource(resourceId)
  const table = useTable(resourceId, tableSlug)
  const view = useTableView(resourceId, tableSlug, viewSlug)
  if (resource.error || table.error || view.error) {
    return <PageError error={resource.error ?? table.error ?? view.error} />
  }
  if (!resource.data || !table.data || !view.data) return <PageLoading />

  return (
    <>
      <SiteHeader
        title={`${resource.data.name} / ${table.data.name} / ${view.data.name}`}
        action={
          <DeleteView
            resourceId={resourceId}
            tableSlug={tableSlug}
            viewSlug={viewSlug}
          />
        }
      />
      <TableTabs
        resourceId={resourceId}
        tableSlug={tableSlug}
        views={table.data.views}
      />
      <ViewTransform
        key={`${resourceId}/${tableSlug}/${viewSlug}`}
        resourceId={resourceId}
        tableSlug={tableSlug}
        viewSlug={viewSlug}
        fields={table.data.fields}
        rows={view.data.rows}
        initial={view.data.config}
      />
    </>
  )
}
