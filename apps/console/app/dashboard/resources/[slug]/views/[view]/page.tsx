import { notFound } from "next/navigation"
import {
  ensureStore,
  getResource,
  getView,
  listRecords,
  listViews,
} from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { ResourceTabs } from "@/components/resource-tabs"
import { ViewTransform } from "@/components/view-transform"
import { DeleteView } from "@/components/delete-view"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function ResourceViewPage({
  params,
}: {
  params: Promise<{ slug: string; view: string }>
}) {
  const { slug, view: viewSlug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, slug)
  if (!resource || resource.source !== "internal") notFound()
  const view = await getView(db, resource.id, viewSlug)
  if (!view) notFound()
  const views = await listViews(db, resource.id)
  const { rows } = await listRecords(db, resource.id, {
    limit: 1000,
    offset: 0,
  })

  return (
    <>
      <SiteHeader
        title={`${resource.name} / ${view.name}`}
        action={
          <DeleteView resourceSlug={resource.slug} viewSlug={view.slug} />
        }
      />
      <ResourceTabs
        resourceSlug={resource.slug}
        views={views.map((v) => ({ slug: v.slug, name: v.name }))}
      />
      <ViewTransform
        resourceSlug={resource.slug}
        viewSlug={view.slug}
        fields={resource.fields}
        rows={rows.map((r) => ({ id: r.id, ...r.data }))}
        initial={view.config}
      />
    </>
  )
}
