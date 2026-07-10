import Link from "next/link"
import { ensureStore, listResources } from "@hypercube/core/store"
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
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function ResourcesPage() {
  const db = instanceDb()
  await ensureStore(db)
  const resources = await listResources(db)
  return (
    <>
      <SiteHeader
        title="Resources"
        action={
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/resources/new" />}
          >
            New resource
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {resources.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No resources yet</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                nativeButton={false}
                render={<Link href="/dashboard/resources/new" />}
              >
                New resource
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            {resources.map((r) => (
              <Card key={r.slug}>
                <CardHeader>
                  <CardTitle>{r.name}</CardTitle>
                  <CardDescription>{r.source}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/dashboard/resources/${r.slug}`} />}
                  >
                    Open
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
