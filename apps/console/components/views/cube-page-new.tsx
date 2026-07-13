"use client"

import { useParams } from "next/navigation"
import { PageEditor } from "@/components/page-editor"
import { ViewFallback } from "@/components/views/fallback"
import type { CubeData, HintsData } from "@/lib/api-types"
import { useData } from "@/lib/data"

export function CubePageNewView() {
  const { cubeId } = useParams<{ cubeId: string }>()
  const cube = useData<CubeData>(`/api/cubes/${encodeURIComponent(cubeId)}`)
  const hints = useData<HintsData>("/api/hints")
  if (!cube.data || !hints.data) {
    return <ViewFallback error={cube.error ?? hints.error} />
  }
  return (
    <PageEditor
      key={cube.data.cube.uuid}
      cubeId={cube.data.cube.uuid}
      cubeName={cube.data.cube.name}
      resources={hints.data}
      isNew
    />
  )
}
