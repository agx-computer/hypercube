import { ensureStore, listCubes } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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

export default async function DashboardPage() {
  const db = instanceDb()
  await ensureStore(db)
  const cubes = await listCubes(db)
  return (
    <>
      <SiteHeader title="Cubes" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {cubes.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No cubes yet</EmptyTitle>
              <EmptyDescription>
                Connect a Postgres database to create your first cube.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<a href="/dashboard/cubes/new" />} nativeButton={false}>
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
                  <CardDescription>
                    {Object.keys(cube.expose).length} exposed entities
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<a href={`/dashboard/cubes/${cube.slug}`} />}
                  >
                    Manage
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    nativeButton={false}
                    render={<a href={`/api/c/${cube.slug}`} />}
                  >
                    API
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
