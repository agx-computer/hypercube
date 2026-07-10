import { NextResponse } from "next/server"
import { ensureStore, getResource, listRecords } from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"
import { loadRows } from "@/lib/resource-data"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource: slug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, slug)
  if (!resource) {
    return NextResponse.json({ error: "no such resource" }, { status: 404 })
  }
  const rows = await loadRows(db, resource, 100)
  return NextResponse.json({
    resource: resource.slug,
    name: resource.name,
    fields: resource.fields,
    total: rows.length,
    rows,
  })
}
