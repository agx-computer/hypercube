import { NextResponse } from "next/server"
import { getCube, listPages } from "@hypercube/core/store"
import type { CubePageData } from "@/lib/api-types"
import { instanceDb } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cubeId: string; page: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { cubeId, page: pageSlug } = await params
  const db = instanceDb()
  const cube = await getCube(db, cubeId)
  if (!cube) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const pages = await listPages(db, cube.id)
  const page = pages.find((p) => p.slug === pageSlug)
  if (!page) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const entryId = cube.entry_page_id ?? pages[0]?.id ?? null
  const data: CubePageData = {
    cube: { uuid: cube.uuid, name: cube.name },
    page: {
      slug: page.slug,
      name: page.name,
      source: page.source,
      entry: page.id === entryId,
    },
  }
  return NextResponse.json(data)
}
