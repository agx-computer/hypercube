"use client"

import { useParams } from "next/navigation"
import { PageEditor } from "@/components/page-editor"
import { ViewFallback } from "@/components/views/fallback"
import type { CubePageData, HintsData } from "@/lib/api-types"
import { useData } from "@/lib/data"

export function CubePageEditView() {
  const { cubeId, page: pageSlug } = useParams<{
    cubeId: string
    page: string
  }>()
  const page = useData<CubePageData>(
    `/api/cubes/${encodeURIComponent(cubeId)}/pages/${encodeURIComponent(pageSlug)}`,
    { revalidateOnFocus: false },
  )
  const hints = useData<HintsData>("/api/hints")
  if (!page.data || !hints.data) {
    return <ViewFallback error={page.error ?? hints.error} />
  }
  const { cube, page: cubePage } = page.data
  return (
    <PageEditor
      key={`${cube.uuid}/${cubePage.slug}`}
      cubeId={cube.uuid}
      cubeName={cube.name}
      pageSlug={cubePage.slug}
      pageName={cubePage.name}
      isEntry={cubePage.entry}
      source={cubePage.source}
      resources={hints.data}
    />
  )
}
