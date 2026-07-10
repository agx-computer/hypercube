import { NextResponse } from "next/server"
import { applyView, renderItem, TemplateError } from "@hypercube/core"
import {
  ensureStore,
  getCube,
  getRecord,
  getView,
} from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"
import { viewApiBase } from "@/lib/origin"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; view: string; id: string }> },
) {
  const { slug, view: viewSlug, id } = await params
  const recordId = Number(id)
  if (Number.isNaN(recordId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 })
  }
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
  const record = await getRecord(db, cube.id, recordId)
  if (!record) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const flat = { id: record.id, ...record.data }
  const [projected] = applyView([flat], view.config)
  const meta = {
    cube: { name: cube.name, slug: cube.slug },
    view: { name: view.name, slug: view.slug },
    api: viewApiBase(request, slug, viewSlug),
  }

  const accept = request.headers.get("accept") ?? ""
  if (accept.includes("text/markdown")) {
    try {
      const md = renderItem(projected ?? flat, view.config, meta)
      return new Response(md, {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      })
    } catch (error) {
      const message =
        error instanceof TemplateError || error instanceof Error
          ? error.message
          : "template error"
      return NextResponse.json({ error: message }, { status: 422 })
    }
  }

  return NextResponse.json({
    cube: cube.slug,
    view: view.slug,
    id: recordId,
    record: projected ?? flat,
  })
}
