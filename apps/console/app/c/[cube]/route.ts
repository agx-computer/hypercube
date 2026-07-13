import { NextResponse } from "next/server"
import { renderPage, TemplateError } from "@hypercube/core"
import { loadCube, loadPageEnv, buildMeta, entryPage } from "@/lib/cube-render"
import { publicOrigin } from "@/lib/origin"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cube: string }> },
) {
  const { cube: slug } = await params
  try {
    const ctx = await loadCube(slug)
    if (!ctx) {
      return NextResponse.json({ error: "no such cube" }, { status: 404 })
    }
    const entry = entryPage(ctx)
    const source = entry?.source ?? "# {{ cube.name }}\n"
    const meta = buildMeta(publicOrigin(request), ctx.cube, ctx.pages, entry)
    const data = await loadPageEnv(ctx.db, source)

    const accept = request.headers.get("accept") ?? ""
    if (accept.includes("application/json")) {
      return NextResponse.json({
        cube: ctx.cube.uuid,
        name: ctx.cube.name,
        entry: entry?.slug ?? null,
        pages: ctx.pages.map((p) => ({ slug: p.slug, name: p.name })),
        data,
      })
    }

    const md = renderPage(source, data, meta)
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
