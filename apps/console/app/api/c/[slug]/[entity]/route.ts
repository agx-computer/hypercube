import { NextResponse } from "next/server"
import { pickFields, runtimeFor, withCube } from "@/lib/cube-api"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; entity: string }> },
) {
  const { slug, entity } = await params
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1)
  const result = await withCube(slug, async (ctx) => {
    const site = ctx.site.entities.find((e) => e.slug === entity)
    if (!site) return { notFound: true as const }
    const pageSize = Math.min(
      200,
      Math.max(
        1,
        Number(url.searchParams.get("pageSize") ?? site.pageSize) ||
          site.pageSize,
      ),
    )
    const list = await runtimeFor(ctx).list({ entity: site.name, page, pageSize })
    return {
      entity: site.slug,
      page,
      pageSize,
      total: list.total,
      rows: list.rows.map((row) => pickFields(row, site)),
    }
  })
  if (!result) return NextResponse.json({ error: "no such cube" }, { status: 404 })
  if ("notFound" in result)
    return NextResponse.json({ error: "no such entity" }, { status: 404 })
  return NextResponse.json(result)
}
