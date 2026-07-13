import { NextResponse } from "next/server"
import {
  getResource,
  getTable,
  getView,
  listRows,
  listViews,
} from "@hypercube/core/store"
import type { ViewData } from "@/lib/api-types"
import { instanceDb } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ resourceId: string; table: string; view: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { resourceId, table: tableSlug, view: viewSlug } = await params
  const db = instanceDb()
  const resource = await getResource(db, resourceId)
  if (!resource) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const table = await getTable(db, resource.id, tableSlug)
  if (!table) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const [view, views, rows] = await Promise.all([
    getView(db, table.id, viewSlug),
    listViews(db, table.id),
    listRows(db, table.id, 1000),
  ])
  if (!view) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const data: ViewData = {
    resource: { uuid: resource.uuid, name: resource.name },
    table: { slug: table.slug, name: table.name, fields: table.fields },
    view: { slug: view.slug, name: view.name, config: view.config },
    views: views.map((v) => ({ slug: v.slug, name: v.name })),
    rows,
  }
  return NextResponse.json(data)
}
