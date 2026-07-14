import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { splitJim } from "@hypercube/core/jim"
import { getCube, listPages } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { ConnectCube } from "@/components/connect-cube"
import { DeleteCube } from "@/components/delete-cube"
import { NewTile, Tile } from "@/components/tiles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { instanceDb } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { PencilIcon } from "lucide-react"

export default function CubePage({
  params,
}: {
  params: Promise<{ cubeId: string }>
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CubeContent params={params} />
    </Suspense>
  )
}

async function CubeContent({
  params,
}: {
  params: Promise<{ cubeId: string }>
}) {
  await requireSession()
  const { cubeId } = await params
  const db = instanceDb()
  const cube = await getCube(db, cubeId)
  if (!cube) notFound()
  const pages = await listPages(db, cube.id)
  const entryId = cube.entry_page_id ?? pages[0]?.id ?? null

  return (
    <>
      <SiteHeader
        title={cube.name}
        action={
          <div className="flex items-center gap-2">
            <ConnectCube cubeId={cube.uuid} />
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/cubes/${cube.uuid}/edit`} />}
            >
              <PencilIcon />
              Edit
            </Button>
            <DeleteCube cubeId={cube.uuid} />
          </div>
        }
      />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
          <NewTile
            href={`/dashboard/cubes/${cube.uuid}/pages/new`}
            label="New page"
          />
          {pages.map((page) => (
            <Tile
              key={page.id}
              href={`/dashboard/cubes/${cube.uuid}/pages/${page.slug}`}
              name={page.id === entryId ? "" : page.name}
              preview={splitJim(page.source).body}
              badge={
                page.id === entryId ? (
                  <Badge variant="secondary" className="shrink-0">
                    Entry
                  </Badge>
                ) : undefined
              }
            />
          ))}
        </div>
      </div>
    </>
  )
}
