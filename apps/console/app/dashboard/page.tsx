import { ensureStore, listCubes, listResources } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { NewTile, Tile } from "@/components/tiles"
import { instanceDb } from "@/lib/db"
import { BoxIcon, DatabaseIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const db = instanceDb()
  await ensureStore(db)
  const [cubes, resources] = await Promise.all([
    listCubes(db),
    listResources(db),
  ])

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Cubes</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
            <NewTile href="/dashboard/cubes/new" label="New cube" />
            {cubes.map((cube) => (
              <Tile
                key={cube.uuid}
                href={`/dashboard/cubes/${cube.uuid}`}
                name={cube.name}
                icon={BoxIcon}
              />
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Resources</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
            <NewTile href="/dashboard/resources/new" label="New resource" />
            {resources.map((r) => (
              <Tile
                key={r.uuid}
                href={`/dashboard/resources/${r.uuid}`}
                name={r.name}
                icon={DatabaseIcon}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
