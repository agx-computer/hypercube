import { notFound } from "next/navigation"
import {
  ensureStore,
  getResource,
  getTable,
  getView,
  listRows,
  listViews,
} from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { TableTabs } from "@/components/table-tabs"
import { ViewTransform } from "@/components/view-transform"
import { DeleteView } from "@/components/delete-view"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function TableViewPage({
  params,
}: {
  params: Promise<{ resourceId: string; table: string; view: string }>
}) {
  const { resourceId, table: tableSlug, view: viewSlug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceId)
  if (!resource) notFound()
  const table = await getTable(db, resource.id, tableSlug)
  if (!table) notFound()
  const view = await getView(db, table.id, viewSlug)
  if (!view) notFound()
  const views = await listViews(db, table.id)
  const rows = await listRows(db, table.id, 1000)

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
        views={views.map((v) => ({ slug: v.slug, name: v.name }))}
      />
      <ViewTransform
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
