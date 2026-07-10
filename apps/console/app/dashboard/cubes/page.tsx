import Link from "next/link"
import { ensureStore, listCubes } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function CubesPage() {
  const db = instanceDb()
  await ensureStore(db)
  const cubes = await listCubes(db)
  return (
    <>
      <SiteHeader
        title="Cubes"
        action={
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/cubes/new" />}
          >
            New cube
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {cubes.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No cubes yet</EmptyTitle>
              <EmptyDescription>
                A cube turns a resource view into agent-ready Markdown pages.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                nativeButton={false}
                render={<Link href="/dashboard/cubes/new" />}
              >
                New cube
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            {cubes.map((cube) => (
              <Card key={cube.slug}>
                <CardHeader>
                  <CardTitle>{cube.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/dashboard/cubes/${cube.slug}`} />}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    nativeButton={false}
                    render={<a href={`/c/${cube.slug}`} />}
                  >
                    Pages
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
