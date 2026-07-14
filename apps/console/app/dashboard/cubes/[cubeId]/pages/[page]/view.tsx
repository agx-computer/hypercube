"use client"

import { useParams } from "next/navigation"
import { PageEditor } from "@/components/page-editor"
import { PageError, PageLoading } from "@/components/page-state"
import { useCube, useResources } from "@/lib/queries"

export default function CubePageEditorPage() {
  const { cubeId, page: pageSlug } = useParams<{
    cubeId: string
    page: string
  }>()
  const cube = useCube(cubeId)
  const resources = useResources(true)
  if (cube.error || resources.error) {
    return <PageError error={cube.error ?? resources.error} />
  }
  if (!cube.data || !resources.data) return <PageLoading />

  const page = cube.data.pages.find((p) => p.slug === pageSlug)
  if (!page) return <PageError error={new Error("Not found.")} />

  return (
    <PageEditor
      key={`${cube.data.uuid}/${page.slug}`}
      cubeId={cube.data.uuid}
      cubeName={cube.data.name}
      pageSlug={page.slug}
      pageName={page.name}
      isEntry={page.entry}
      source={page.source}
      resources={resources.data}
    />
  )
}
