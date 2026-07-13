import { notFound } from "next/navigation"
import { ensureStore, getCube } from "@hypercube/core/store"
import { PageEditor } from "@/components/page-editor"
import { instanceDb } from "@/lib/db"
import { resourceHints } from "@/lib/resource-hints"

export const dynamic = "force-dynamic"

export default async function NewPageEditorPage({
  params,
}: {
  params: Promise<{ cubeId: string }>
}) {
  const { cubeId } = await params
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeId)
  if (!cube) notFound()
  const resources = await resourceHints(db)

  return (
    <PageEditor
      cubeId={cube.uuid}
      cubeName={cube.name}
      resources={resources}
      isNew
    />
  )
}
