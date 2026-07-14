import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCube } from "@hypercube/core/store"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { PageEditor } from "@/components/page-editor"
import { instanceDb } from "@/lib/db"
import { resourceHints } from "@/lib/resource-hints"
import { requireSession } from "@/lib/session"

export default function NewPageEditorPage({
  params,
}: {
  params: Promise<{ cubeId: string }>
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <NewPageEditor params={params} />
    </Suspense>
  )
}

async function NewPageEditor({
  params,
}: {
  params: Promise<{ cubeId: string }>
}) {
  await requireSession()
  const { cubeId } = await params
  const db = instanceDb()
  const [cube, resources] = await Promise.all([
    getCube(db, cubeId),
    resourceHints(db),
  ])
  if (!cube) notFound()

  return (
    <PageEditor
      cubeId={cube.uuid}
      cubeName={cube.name}
      resources={resources}
      isNew
    />
  )
}
