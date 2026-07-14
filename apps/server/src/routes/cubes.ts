import { Hono } from "hono"
import { renderPage, TemplateError } from "@hypercube/core/render"
import {
  createCube,
  createPage,
  deleteCube,
  deletePage,
  getCube,
  getPage,
  listAllPages,
  listCubes,
  listPages,
  updateCube,
  updatePage,
} from "@hypercube/core/store"
import { buildMeta, loadPageEnv } from "../cube-render"
import type { AppEnv } from "../env"
import { slugify, validateSource, STARTER_SOURCE } from "../lib"

export const cubes = new Hono<AppEnv>()

cubes.get("/", async (c) => {
  const db = c.get("db")
  const [cubeRows, allPages] = await Promise.all([
    listCubes(db),
    listAllPages(db),
  ])
  return c.json(
    cubeRows.map((cube) => {
      const pages = allPages.filter((p) => p.cube_id === cube.id)
      const entryId = cube.entry_page_id ?? pages[0]?.id ?? null
      return {
        uuid: cube.uuid,
        name: cube.name,
        pages: pages.map((p) => ({
          slug: p.slug,
          name: p.name,
          entry: p.id === entryId,
        })),
      }
    }),
  )
})

cubes.post("/", async (c) => {
  const body = await c.req.json<{ name?: string }>()
  const name = String(body.name ?? "").trim()
  if (!name) return c.json({ error: "cube name required" }, 400)
  const db = c.get("db")
  const cube = await createCube(db, { name })
  const pageId = await createPage(db, {
    cubeId: cube.id,
    slug: "index",
    name: "Index",
    source: STARTER_SOURCE,
  })
  await updateCube(db, cube.uuid, { entryPageId: pageId })
  return c.json({ uuid: cube.uuid }, 201)
})

cubes.get("/:cubeId", async (c) => {
  const db = c.get("db")
  const cube = await getCube(db, c.req.param("cubeId"))
  if (!cube) return c.json({ error: "no such cube" }, 404)
  const pages = await listPages(db, cube.id)
  const entryId = cube.entry_page_id ?? pages[0]?.id ?? null
  return c.json({
    uuid: cube.uuid,
    name: cube.name,
    pages: pages.map((p) => ({
      slug: p.slug,
      name: p.name,
      entry: p.id === entryId,
      source: p.source,
    })),
  })
})

cubes.patch("/:cubeId", async (c) => {
  const body = await c.req.json<{ name?: string }>()
  const name = String(body.name ?? "").trim()
  if (!name) return c.json({ error: "cube name required" }, 400)
  const db = c.get("db")
  const cube = await getCube(db, c.req.param("cubeId"))
  if (!cube) return c.json({ error: "no such cube" }, 404)
  await updateCube(db, cube.uuid, { name })
  return c.json({ ok: true })
})

cubes.delete("/:cubeId", async (c) => {
  const db = c.get("db")
  const cube = await getCube(db, c.req.param("cubeId"))
  if (!cube) return c.json({ error: "no such cube" }, 404)
  await deleteCube(db, cube.uuid)
  return c.json({ ok: true })
})

cubes.post("/:cubeId/pages", async (c) => {
  const body = await c.req.json<{ name?: string; source?: string }>()
  const name = String(body.name ?? "").trim()
  if (!name) return c.json({ error: "page name required" }, 400)
  const slug = slugify(name)
  if (!slug) return c.json({ error: "invalid page name" }, 400)
  const source = String(body.source ?? "")
  const invalid = await validateSource(source)
  if (invalid) return c.json({ error: invalid }, 422)
  const db = c.get("db")
  const cube = await getCube(db, c.req.param("cubeId"))
  if (!cube) return c.json({ error: "no such cube" }, 404)
  const pageId = await createPage(db, { cubeId: cube.id, slug, name, source })
  if (cube.entry_page_id == null) {
    await updateCube(db, cube.uuid, { entryPageId: pageId })
  }
  return c.json({ slug }, 201)
})

cubes.patch("/:cubeId/pages/:slug", async (c) => {
  const body = await c.req.json<{ name?: string; source?: string }>()
  const db = c.get("db")
  const cube = await getCube(db, c.req.param("cubeId"))
  if (!cube) return c.json({ error: "no such cube" }, 404)
  const page = await getPage(db, cube.id, c.req.param("slug"))
  if (!page) return c.json({ error: "no such page" }, 404)
  const patch: { name?: string; source?: string } = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return c.json({ error: "page name required" }, 400)
    patch.name = name
  }
  if (body.source !== undefined) {
    const invalid = await validateSource(body.source)
    if (invalid) return c.json({ error: invalid }, 422)
    patch.source = body.source
  }
  await updatePage(db, cube.id, page.slug, patch)
  return c.json({ ok: true })
})

cubes.delete("/:cubeId/pages/:slug", async (c) => {
  const db = c.get("db")
  const cube = await getCube(db, c.req.param("cubeId"))
  if (!cube) return c.json({ error: "no such cube" }, 404)
  await deletePage(db, cube.id, c.req.param("slug"))
  return c.json({ ok: true })
})

cubes.post("/:cubeId/preview", async (c) => {
  const body = await c.req.json<{ source?: string; page?: string }>()
  const source = String(body.source ?? "")
  const db = c.get("db")
  const cube = await getCube(db, c.req.param("cubeId"))
  if (!cube) return c.json({ error: "no such cube" }, 404)
  const pages = await listPages(db, cube.id)
  const page = pages.find((p) => p.slug === body.page) ?? null
  try {
    const data = await loadPageEnv(db, source)
    const origin = new URL(c.req.url).origin
    const meta = buildMeta(origin, cube, pages, page)
    return c.json({ markdown: await renderPage(source, data, meta) })
  } catch (error) {
    if (error instanceof TemplateError) {
      return c.json({ error: error.message }, 422)
    }
    return c.json(
      { error: error instanceof Error ? error.message : String(error) },
      422,
    )
  }
})
