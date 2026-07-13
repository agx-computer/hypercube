import { NextResponse } from "next/server"
import { splitJim } from "@hypercube/core/jim"
import { getCube, listPages } from "@hypercube/core/store"
import type { CubeData } from "@/lib/api-types"
import { instanceDb } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cubeId: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { cubeId } = await params
  const db = instanceDb()
  const cube = await getCube(db, cubeId)
  if (!cube) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const pages = await listPages(db, cube.id)
  const entryId = cube.entry_page_id ?? pages[0]?.id ?? null
  const data: CubeData = {
    cube: { uuid: cube.uuid, name: cube.name },
    pages: pages.map((p) => ({
      slug: p.slug,
      name: p.name,
      entry: p.id === entryId,
      preview: splitJim(p.source).body,
    })),
  }
  return NextResponse.json(data)
}
