import { NextResponse } from "next/server"
import {
  listAllPages,
  listAllTables,
  listCubes,
  listResources,
} from "@hypercube/core/store"
import type { NavData } from "@/lib/api-types"
import { instanceDb } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const db = instanceDb()
  const [resourceRows, cubeRows, allTables, allPages] = await Promise.all([
    listResources(db),
    listCubes(db),
    listAllTables(db),
    listAllPages(db),
  ])
  const data: NavData = {
    user: {
      name: session.user.name ?? session.user.email,
      email: session.user.email,
    },
    resources: resourceRows.map((r) => ({
      uuid: r.uuid,
      name: r.name,
      source: r.source,
      tables: allTables
        .filter((t) => t.resource_id === r.id)
        .map((t) => ({ slug: t.slug, name: t.name })),
    })),
    cubes: cubeRows.map((c) => {
      const pages = allPages.filter((p) => p.cube_id === c.id)
      const entryId = c.entry_page_id ?? pages[0]?.id ?? null
      return {
        uuid: c.uuid,
        name: c.name,
        pages: pages.map((p) => ({
          slug: p.slug,
          name: p.name,
          entry: p.id === entryId,
        })),
      }
    }),
  }
  return NextResponse.json(data)
}
