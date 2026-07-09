import { NextResponse } from "next/server"
import { applyView } from "@hypercube/core"
import {
  ensureStore,
  getCube,
  getView,
  listRecords,
} from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; view: string }> },
) {
  const { slug, view: viewSlug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, slug)
  if (!cube || cube.source !== "internal") {
    return NextResponse.json({ error: "no such cube" }, { status: 404 })
  }
  const view = await getView(db, cube.id, viewSlug)
  if (!view) {
    return NextResponse.json({ error: "no such view" }, { status: 404 })
  }
  const { rows } = await listRecords(db, cube.id, { limit: 1000, offset: 0 })
  const flat = rows.map((r) => ({ id: r.id, ...r.data }))
  const transformed = applyView(flat, view.config)
  return NextResponse.json({
    cube: cube.slug,
    view: view.slug,
    name: view.name,
    total: transformed.length,
    rows: transformed,
  })
}
