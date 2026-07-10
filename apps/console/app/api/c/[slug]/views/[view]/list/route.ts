import { NextResponse } from "next/server"
import { renderList, TemplateError } from "@hypercube/core"
import { applyView } from "@hypercube/core/view"
import {
  ensureStore,
  getCube,
  getView,
  listRecords,
} from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"
import { viewApiBase } from "@/lib/origin"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; view: string }> },
) {
  const { slug, view: viewSlug } = await params
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1)
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
  const { rows } = await listRecords(db, cube.id, { limit: 100000, offset: 0 })
  const flat = rows.map((r) => ({ id: r.id, ...r.data }))
  const transformed = applyView(flat, view.config)

  const meta = {
    cube: { name: cube.name, slug: cube.slug },
    view: { name: view.name, slug: view.slug },
    api: viewApiBase(request, slug, viewSlug),
  }

  const accept = request.headers.get("accept") ?? ""
  if (accept.includes("text/markdown")) {
    try {
      const r = renderList(transformed, view.config, meta, { page })
      return new Response(r.markdown, {
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "x-page": String(r.page),
          "x-pages": String(r.pages),
          "x-total": String(r.total),
        },
      })
    } catch (error) {
      const message =
        error instanceof TemplateError || error instanceof Error
          ? error.message
          : "template error"
      return NextResponse.json({ error: message }, { status: 422 })
    }
  }

  const r = renderList(transformed, view.config, meta, { page })
  return NextResponse.json({
    view: view.slug,
    page: r.page,
    pages: r.pages,
    total: r.total,
    rows: transformed.slice(
      (r.page - 1) * (view.config.pageSize ?? 25),
      r.page * (view.config.pageSize ?? 25),
    ),
  })
}
