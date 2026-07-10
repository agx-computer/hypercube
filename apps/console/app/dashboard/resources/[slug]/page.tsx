import { notFound } from "next/navigation"
import Link from "next/link"
import type { SchemaModel } from "@hypercube/core"
import { introspect } from "@hypercube/core/postgres"
import {
  ensureStore,
  getResource,
  listRecords,
  listViews,
} from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RecordsTable } from "@/components/records-table"
import { ResourceTabs } from "@/components/resource-tabs"
import { PencilIcon } from "lucide-react"
import { instanceDb, targetDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, slug)
  if (!resource) notFound()
  const views = await listViews(db, resource.id)

  const editButton = (
    <Button
      size="sm"
      variant="outline"
      nativeButton={false}
      render={<Link href={`/dashboard/resources/${resource.slug}/edit`} />}
    >
      <PencilIcon />
      Edit
    </Button>
  )

  if (resource.source === "internal") {
    const { rows } = await listRecords(db, resource.id, {
      limit: 100,
      offset: 0,
    })
    return (
      <>
        <SiteHeader title={resource.name} action={editButton} />
        <ResourceTabs
          resourceSlug={resource.slug}
          views={views.map((v) => ({ slug: v.slug, name: v.name }))}
        />
        <div className="flex flex-1 flex-col">
          <RecordsTable
            resourceSlug={resource.slug}
            fields={resource.fields}
            rows={rows.map((r) => ({ id: r.id, data: r.data }))}
          />
        </div>
      </>
    )
  }

  let model: SchemaModel = { entities: [] }
  let connectionError = ""
  const target = targetDb(resource.database_url ?? "")
  try {
    model = await introspect(target, resource.schema_name)
  } catch (error) {
    connectionError = error instanceof Error ? error.message : String(error)
  } finally {
    await target.destroy()
  }
  return (
    <>
      <SiteHeader title={resource.name} action={editButton} />
      <ResourceTabs
        resourceSlug={resource.slug}
        views={views.map((v) => ({ slug: v.slug, name: v.name }))}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {connectionError ? (
          <Card>
            <CardHeader>
              <CardTitle>Connection failed</CardTitle>
              <CardDescription>{connectionError}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tables</CardTitle>
              <CardDescription>
                {model.entities.map((e) => e.name).join(", ") || "None found."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </>
  )
}
