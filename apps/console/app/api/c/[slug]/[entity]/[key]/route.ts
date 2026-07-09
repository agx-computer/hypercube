import { NextResponse } from "next/server"
import { pickFields, withCube } from "@/lib/cube-api"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; entity: string; key: string }> },
) {
  const { slug, entity, key } = await params
  const result = await withCube(slug, async (ctx) => {
    const site = ctx.site.entities.find((e) => e.slug === entity)
    if (!site) return { notFound: true as const }
    const row = await ctx.runtime.get(site.name, key)
    if (!row) return { notFound: true as const }
    return { entity: site.slug, row: pickFields(row, site) }
  })
  if (!result) return NextResponse.json({ error: "no such cube" }, { status: 404 })
  if ("notFound" in result)
    return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(result)
}
