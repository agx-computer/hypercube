import { NextResponse } from "next/server"
import { ensureStore, getResource, listTables } from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"

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
  const tables = await listTables(db, resource.id)
  return NextResponse.json({
    resource: resource.uuid,
    name: resource.name,
    source: resource.source,
    tables: tables.map((t) => ({
      slug: t.slug,
      name: t.name,
      fields: t.fields,
      synced_at: t.synced_at,
    })),
  })
}
