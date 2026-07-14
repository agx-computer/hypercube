"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { splitJim } from "@hypercube/core/jim"
import { SiteHeader } from "@/components/site-header"
import { ConnectCube } from "@/components/connect-cube"
import { DeleteCube } from "@/components/delete-cube"
import { NewTile, Tile } from "@/components/tiles"
import { PageError, PageLoading } from "@/components/page-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCube } from "@/lib/queries"
import { PencilIcon } from "lucide-react"

export default function CubePage() {
  const { cubeId } = useParams<{ cubeId: string }>()
  const { data: cube, error } = useCube(cubeId)
  if (error) return <PageError error={error} />
  if (!cube) return <PageLoading />

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
          {cube.pages.map((page) => (
            <Tile
              key={page.slug}
              href={`/dashboard/cubes/${cube.uuid}/pages/${page.slug}`}
              name={page.entry ? "" : page.name}
              preview={splitJim(page.source).body}
              badge={
                page.entry ? (
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
