import { NextResponse } from "next/server"
import { renderCube, TemplateError } from "@hypercube/core"
import { loadCube, cubeMeta } from "@/lib/cube-render"

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
    const meta = cubeMeta(request, ctx)

    const accept = request.headers.get("accept") ?? ""
    if (accept.includes("text/markdown")) {
      const md = renderCube(ctx.rows, ctx.cube.template, meta)
      return new Response(md, {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      })
    }

    return NextResponse.json({
      cube: ctx.cube.slug,
      name: ctx.cube.name,
      total: ctx.rows.length,
      rows: ctx.rows,
    })
  } catch (error) {
    if (error instanceof TemplateError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    throw error
  }
}
