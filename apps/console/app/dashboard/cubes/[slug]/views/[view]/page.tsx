import { notFound } from "next/navigation"
import Link from "next/link"
import { applyView } from "@hypercube/core"
import {
  ensureStore,
  getCube,
  getView,
  listRecords,
  listViews,
} from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { CubeTabs } from "@/components/cube-tabs"
import { ViewEditor } from "@/components/view-editor"
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
      <ViewEditor
        cubeSlug={cube.slug}
        viewSlug={view.slug}
        fields={cube.fields}
        initial={view.config}
      />
    </>
  )
}
