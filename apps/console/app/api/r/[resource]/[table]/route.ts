import { NextResponse } from "next/server"
import {
  ensureStore,
  getResource,
  getTable,
  listRows,
} from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string; table: string }> },
) {
  const { resource: slug, table: tableSlug } = await params
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
  const rows = await listRows(db, table.id, 100)
  return NextResponse.json({
    resource: resource.uuid,
    table: table.slug,
    name: table.name,
    fields: table.fields,
    total: rows.length,
    rows,
  })
}
