import { NextResponse } from "next/server"
import {
  getResource,
  getTable,
  listRecords,
  listViews,
} from "@hypercube/core/store"
import type { TableData } from "@/lib/api-types"
import { instanceDb } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resourceId: string; table: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { resourceId, table: tableSlug } = await params
  const db = instanceDb()
  const resource = await getResource(db, resourceId)
  if (!resource) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const table = await getTable(db, resource.id, tableSlug)
  if (!table) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const [views, { rows }] = await Promise.all([
    listViews(db, table.id),
    listRecords(db, table.id, { limit: 100, offset: 0 }),
  ])
  const data: TableData = {
    resource: {
      uuid: resource.uuid,
      name: resource.name,
      source: resource.source,
    },
    table: { slug: table.slug, name: table.name, fields: table.fields },
    views: views.map((v) => ({ slug: v.slug, name: v.name })),
    rows: rows.map((r) => ({ id: r.id, data: r.data })),
  }
  return NextResponse.json(data)
}
