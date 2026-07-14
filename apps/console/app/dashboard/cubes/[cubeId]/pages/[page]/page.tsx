import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCube, listPages } from "@hypercube/core/store"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { PageEditor } from "@/components/page-editor"
import { instanceDb } from "@/lib/db"
import { resourceHints } from "@/lib/resource-hints"
import { requireSession } from "@/lib/session"

export default function CubePageEditorPage({
  params,
}: {
  params: Promise<{ cubeId: string; page: string }>
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PageEditorContent params={params} />
    </Suspense>
  )
}

async function PageEditorContent({
  params,
}: {
  params: Promise<{ cubeId: string; page: string }>
}) {
  await requireSession()
  const { cubeId, page: pageSlug } = await params
  const db = instanceDb()
  const cube = await getCube(db, cubeId)
  if (!cube) notFound()
  const [pages, resources] = await Promise.all([
    listPages(db, cube.id),
    resourceHints(db),
  ])
  const page = pages.find((p) => p.slug === pageSlug)
  if (!page) notFound()

  const entryId = cube.entry_page_id ?? pages[0]?.id ?? null
  const isEntry = page.id === entryId

  return (
    <PageEditor
      key={`${cube.uuid}/${page.slug}`}
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
