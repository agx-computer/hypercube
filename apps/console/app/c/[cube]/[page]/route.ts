import { NextResponse } from "next/server"
import { renderPage, TemplateError } from "@hypercube/core"
import { loadCube, loadPageEnv, buildMeta } from "@/lib/cube-render"
import { publicOrigin } from "@/lib/origin"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cube: string; page: string }> },
) {
  const { cube: slug, page: pageSlug } = await params
  try {
    const ctx = await loadCube(slug)
    if (!ctx) {
      return NextResponse.json({ error: "no such cube" }, { status: 404 })
    }
    const page = ctx.pages.find((p) => p.slug === pageSlug)
    if (!page) {
      return NextResponse.json({ error: "no such page" }, { status: 404 })
    }
    const meta = buildMeta(publicOrigin(request), ctx.cube, ctx.pages, page)
    const data = await loadPageEnv(ctx.db, page.source)

    const accept = request.headers.get("accept") ?? ""
    if (accept.includes("application/json")) {
      return NextResponse.json({
        cube: ctx.cube.uuid,
        page: page.slug,
        name: page.name,
        pages: ctx.pages.map((p) => ({ slug: p.slug, name: p.name })),
        data,
      })
    }

    const md = renderPage(page.source, data, meta)
    return new Response(md, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    })
  } catch (error) {
    if (error instanceof TemplateError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    throw error
  }
}
