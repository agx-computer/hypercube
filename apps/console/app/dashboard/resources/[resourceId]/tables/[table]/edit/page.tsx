import { notFound } from "next/navigation"
import { ensureStore, getResource, getTable } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SettingsRow } from "@/components/settings-row"
import { DeleteTable } from "@/components/delete-table"
import { updateTableMetaAction } from "@/lib/actions"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function EditTablePage({
  params,
}: {
  params: Promise<{ resourceId: string; table: string }>
}) {
  const { resourceId, table: tableSlug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceId)
  if (!resource || resource.source !== "internal") notFound()
  const table = await getTable(db, resource.id, tableSlug)
  if (!table) notFound()
  const save = updateTableMetaAction.bind(null, resource.uuid, table.slug)

  return (
    <>
      <SiteHeader title={`${resource.name} / ${table.name} / Edit`} />
      <div className="flex flex-1 gap-8 p-4 md:p-8">
        <nav className="w-40 shrink-0">
          <div className="bg-muted text-foreground block px-3 py-2 text-sm font-medium">
            General
          </div>
        </nav>
        <div className="flex max-w-2xl flex-1 flex-col gap-10">
          <section>
            <h2 className="text-lg font-semibold">General</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Name this table.
            </p>
            <form action={save} className="border-border border">
              <SettingsRow label="Name" description="Displayed in the dashboard.">
                <Input
                  name="name"
                  defaultValue={table.name}
                  required
                  className="w-72"
                />
              </SettingsRow>
              <SettingsRow label="Slug" description="Reference in URLs and pages.">
                <code className="bg-muted px-2 py-1 text-xs">{table.slug}</code>
              </SettingsRow>
              <div className="bg-muted/40 flex justify-end px-5 py-3">
                <Button type="submit" size="sm">
                  Save changes
                </Button>
              </div>
            </form>
          </section>

          <section>
            <h2 className="text-destructive text-lg font-semibold">
              Danger zone
            </h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Deleting a table is permanent.
            </p>
            <div className="border-destructive/40 border">
              <SettingsRow
                label="Delete table"
                description="Remove this table, its records, and views."
              >
                <DeleteTable resourceId={resource.uuid} tableSlug={table.slug} />
              </SettingsRow>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
