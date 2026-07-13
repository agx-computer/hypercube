"use client"

import { SiteHeader } from "@/components/site-header"
import { NewTile, Tile } from "@/components/tiles"
import { ViewFallback } from "@/components/views/fallback"
import type { NavData } from "@/lib/api-types"
import { useData } from "@/lib/data"
import { BoxIcon, DatabaseIcon } from "lucide-react"

export function DashboardView() {
  const { data, error } = useData<NavData>("/api/nav")
  if (!data) return <ViewFallback error={error} />
  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Cubes</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
            <NewTile href="/dashboard/cubes/new" label="New cube" />
            {data.cubes.map((cube) => (
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
            {data.resources.map((r) => (
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
