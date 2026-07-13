import { NextResponse } from "next/server"
import { getResource, listTables } from "@hypercube/core/store"
import type { ResourceData } from "@/lib/api-types"
import { instanceDb } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { resourceId } = await params
  const db = instanceDb()
  const resource = await getResource(db, resourceId)
  if (!resource) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const tables = await listTables(db, resource.id)
  const data: ResourceData = {
    resource: {
      uuid: resource.uuid,
      name: resource.name,
      source: resource.source,
      database_url: resource.database_url,
      schema_name: resource.schema_name,
    },
    tables: tables.map((t) => ({
      slug: t.slug,
      name: t.name,
      synced_at: t.synced_at,
    })),
  }
  return NextResponse.json(data)
}
