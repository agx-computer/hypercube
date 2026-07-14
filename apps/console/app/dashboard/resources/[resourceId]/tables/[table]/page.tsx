import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import {
  getResource,
  getTable,
  listRecords,
  listViews,
} from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { RecordsTable } from "@/components/records-table"
import { TableTabs } from "@/components/table-tabs"
import { instanceDb } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { PencilIcon } from "lucide-react"

export default function TablePage({
  params,
}: {
  params: Promise<{ resourceId: string; table: string }>
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TableContent params={params} />
    </Suspense>
  )
}

async function TableContent({
  params,
}: {
  params: Promise<{ resourceId: string; table: string }>
}) {
  await requireSession()
  const { resourceId, table: tableSlug } = await params
  const db = instanceDb()
  const resource = await getResource(db, resourceId)
  if (!resource) notFound()
  const table = await getTable(db, resource.id, tableSlug)
  if (!table) notFound()
  const [views, { rows }] = await Promise.all([
    listViews(db, table.id),
    listRecords(db, table.id, { limit: 100, offset: 0 }),
  ])
  const readOnly = resource.source === "postgres"

  return (
    <>
      <SiteHeader
        title={`${resource.name} / ${table.name}`}
        action={
          readOnly ? undefined : (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/dashboard/resources/${resource.uuid}/tables/${table.slug}/edit`}
                />
              }
            >
              <PencilIcon />
              Edit
            </Button>
          )
        }
      />
      <TableTabs
        resourceId={resource.uuid}
        tableSlug={table.slug}
        views={views.map((v) => ({ slug: v.slug, name: v.name }))}
      />
      <div className="flex flex-1 flex-col">
        <RecordsTable
          resourceId={resource.uuid}
          tableSlug={table.slug}
          fields={table.fields}
          rows={rows.map((r) => ({ id: r.id, data: r.data }))}
          readOnly={readOnly}
        />
      </div>
    </>
  )
}
