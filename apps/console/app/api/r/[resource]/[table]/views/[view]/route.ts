import { NextResponse } from "next/server"
import { applyView } from "@hypercube/core/view"
import {
  ensureStore,
  getResource,
  getTable,
  getView,
  listRows,
} from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ resource: string; table: string; view: string }>
  },
) {
  const { resource: slug, table: tableSlug, view: viewSlug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, slug)
  if (!resource) {
    return NextResponse.json({ error: "no such resource" }, { status: 404 })
  }
  const table = await getTable(db, resource.id, tableSlug)
  if (!table) {
    return NextResponse.json({ error: "no such table" }, { status: 404 })
  }
  const view = await getView(db, table.id, viewSlug)
  if (!view) {
    return NextResponse.json({ error: "no such view" }, { status: 404 })
  }
  const rows = await listRows(db, table.id, 100000)
  const transformed = applyView(rows, view.config)
  return NextResponse.json({
    resource: resource.uuid,
    table: table.slug,
    view: view.slug,
    total: transformed.length,
    rows: transformed,
  })
}
