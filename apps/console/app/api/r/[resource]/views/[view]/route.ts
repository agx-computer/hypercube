import { NextResponse } from "next/server"
import { applyView } from "@hypercube/core/view"
import { ensureStore, getResource, getView } from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"
import { loadRows } from "@/lib/resource-data"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string; view: string }> },
) {
  const { resource: slug, view: viewSlug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, slug)
  if (!resource) {
    return NextResponse.json({ error: "no such resource" }, { status: 404 })
  }
  const view = await getView(db, resource.id, viewSlug)
  if (!view) {
    return NextResponse.json({ error: "no such view" }, { status: 404 })
  }
  const rows = await loadRows(db, resource)
  const transformed = applyView(rows, view.config)
  return NextResponse.json({
    resource: resource.slug,
    view: view.slug,
    total: transformed.length,
    rows: transformed,
  })
}
