"use client"

import { useParams } from "next/navigation"
import { PageEditor } from "@/components/page-editor"
import { PageError, PageLoading } from "@/components/page-state"
import { useCube, useResources } from "@/lib/queries"

export default function NewPageEditorPage() {
  const { cubeId } = useParams<{ cubeId: string }>()
  const cube = useCube(cubeId)
  const resources = useResources(true)
  if (cube.error || resources.error) {
    return <PageError error={cube.error ?? resources.error} />
  }
  if (!cube.data || !resources.data) return <PageLoading />

  return (
    <PageEditor
      key={cube.data.uuid}
      cubeId={cube.data.uuid}
      cubeName={cube.data.name}
      resources={resources.data}
      isNew
    />
  )
}
