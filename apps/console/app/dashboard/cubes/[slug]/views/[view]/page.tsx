import { notFound } from "next/navigation"
import {
  ensureStore,
  getCube,
  getView,
  listRecords,
  listViews,
} from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { CubeTabs } from "@/components/cube-tabs"
import { ViewWorkspace } from "@/components/view-workspace"
import { DeleteView } from "@/components/delete-view"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function ViewPage({
  params,
}: {
  params: Promise<{ slug: string; view: string }>
}) {
  const { slug, view: viewSlug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, slug)
  if (!cube || cube.source !== "internal") notFound()
  const view = await getView(db, cube.id, viewSlug)
  if (!view) notFound()
  const views = await listViews(db, cube.id)
  const { rows } = await listRecords(db, cube.id, { limit: 1000, offset: 0 })

  return (
    <>
      <SiteHeader
        title={`${cube.name} / ${view.name}`}
        action={<DeleteView cubeSlug={cube.slug} viewSlug={view.slug} />}
      />
      <CubeTabs
        cubeSlug={cube.slug}
        views={views.map((v) => ({ slug: v.slug, name: v.name }))}
      />
      <ViewWorkspace
        cubeSlug={cube.slug}
        cubeName={cube.name}
        viewSlug={view.slug}
        viewName={view.name}
        fields={cube.fields}
        rows={rows.map((r) => ({ id: r.id, ...r.data }))}
        initial={view.config}
      />
    </>
  )
}
