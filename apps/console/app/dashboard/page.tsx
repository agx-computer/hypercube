"use client"

import { SiteHeader } from "@/components/site-header"
import { NewTile, Tile } from "@/components/tiles"
import { PageError, PageLoading } from "@/components/page-state"
import { useCubes, useResources } from "@/lib/queries"
import { BoxIcon, DatabaseIcon } from "lucide-react"

export default function DashboardPage() {
  const cubes = useCubes()
  const resources = useResources()
  if (cubes.error || resources.error) {
    return <PageError error={cubes.error ?? resources.error} />
  }
  if (!cubes.data || !resources.data) return <PageLoading />

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Cubes</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
            <NewTile href="/dashboard/cubes/new" label="New cube" />
            {cubes.data.map((cube) => (
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
            {resources.data.map((r) => (
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
