import { notFound } from "next/navigation"
import { ensureStore, getCube, listPages } from "@hypercube/core/store"
import { PageEditor } from "@/components/page-editor"
import { instanceDb } from "@/lib/db"
import { resourceHints } from "@/lib/resource-hints"

export const dynamic = "force-dynamic"

export default async function CubePageEditorPage({
  params,
}: {
  params: Promise<{ cubeId: string; page: string }>
}) {
  const { cubeId, page: pageSlug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeId)
  if (!cube) notFound()
  const pages = await listPages(db, cube.id)
  const page = pages.find((p) => p.slug === pageSlug)
  if (!page) notFound()

  const entryId = cube.entry_page_id ?? pages[0]?.id ?? null
  const isEntry = page.id === entryId
  const resources = await resourceHints(db)

  return (
    <PageEditor
      cubeId={cube.uuid}
      cubeName={cube.name}
      pageSlug={page.slug}
      pageName={page.name}
      isEntry={isEntry}
      source={page.source}
      resources={resources}
    />
  )
}
