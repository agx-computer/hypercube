import { NextResponse } from "next/server"
import { withCube } from "@/lib/cube-api"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const result = await withCube(slug, async ({ cube, site }) => ({
    slug: cube.slug,
    name: cube.name,
    description: cube.description,
    entities: site.entities.map((e) => ({
      name: e.slug,
      label: e.label,
      description: e.description ?? null,
      key: e.key,
      fields: e.fields,
      relations: e.relations.filter((r) =>
        site.entities.some((t) => t.name === r.entity),
      ),
    })),
  }))
  if (!result) {
    return NextResponse.json({ error: "no such cube" }, { status: 404 })
  }
  return NextResponse.json(result)
}
