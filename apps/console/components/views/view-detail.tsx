"use client"

import { useParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { TableTabs } from "@/components/table-tabs"
import { ViewTransform } from "@/components/view-transform"
import { DeleteView } from "@/components/delete-view"
import { ViewFallback } from "@/components/views/fallback"
import type { ViewData } from "@/lib/api-types"
import { useData } from "@/lib/data"

export function ViewDetailView() {
  const {
    resourceId,
    table: tableSlug,
    view: viewSlug,
  } = useParams<{ resourceId: string; table: string; view: string }>()
  const { data, error } = useData<ViewData>(
    `/api/resources/${encodeURIComponent(resourceId)}/tables/${encodeURIComponent(tableSlug)}/views/${encodeURIComponent(viewSlug)}`,
  )
  if (!data) return <ViewFallback error={error} />
  const { resource, table, view, views, rows } = data
  return (
    <>
      <SiteHeader
        title={`${resource.name} / ${table.name} / ${view.name}`}
        action={
          <DeleteView
            resourceId={resource.uuid}
            tableSlug={table.slug}
            viewSlug={view.slug}
          />
        }
      />
      <TableTabs
        resourceId={resource.uuid}
        tableSlug={table.slug}
        views={views}
      />
      <ViewTransform
        key={`${resource.uuid}/${table.slug}/${view.slug}`}
        resourceId={resource.uuid}
        tableSlug={table.slug}
        viewSlug={view.slug}
        fields={table.fields}
        rows={rows}
        initial={view.config}
      />
    </>
  )
}
