import { notFound } from "next/navigation"
import {
  ensureStore,
  getCube,
  getResourceById,
  getViewById,
} from "@hypercube/core/store"
import { applyView } from "@hypercube/core/view"
import { SiteHeader } from "@/components/site-header"
import { CubeEditor } from "@/components/cube-editor"
import { DeleteCube } from "@/components/delete-cube"
import { instanceDb } from "@/lib/db"
import { loadRows } from "@/lib/resource-data"

export const dynamic = "force-dynamic"

export default async function CubePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, slug)
  if (!cube) notFound()
  const view = await getViewById(db, cube.view_id)
  const resource = await getResourceById(db, cube.resource_id)
  if (!view || !resource) notFound()

  const raw = await loadRows(db, resource)
  const viewedRows = applyView(raw, view.config)

  return (
    <>
      <SiteHeader
        title={cube.name}
        action={<DeleteCube slug={cube.slug} name={cube.name} />}
      />
      <div className="text-muted-foreground border-b px-4 py-2 text-xs">
        Source: {resource.name} / {view.name} &middot;{" "}
        <a className="text-primary hover:underline" href={`/c/${cube.slug}`}>
          /c/{cube.slug}
        </a>
      </div>
      <CubeEditor
        cubeSlug={cube.slug}
        cubeName={cube.name}
        viewedRows={viewedRows}
        transform={cube.transform}
        template={cube.template}
      />
    </>
  )
}
