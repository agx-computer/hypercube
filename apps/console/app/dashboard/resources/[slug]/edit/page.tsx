import { notFound } from "next/navigation"
import Link from "next/link"
import { ensureStore, getResource } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SettingsRow } from "@/components/settings-row"
import { DeleteResource } from "@/components/delete-resource"
import { updateResourceAction } from "@/lib/actions"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function EditResource({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, slug)
  if (!resource) notFound()
  const save = updateResourceAction.bind(null, resource.slug)

  return (
    <>
      <SiteHeader title={`${resource.name} / Edit`} />
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
              Name and describe this resource.
            </p>
            <form action={save} className="border-border border">
              <SettingsRow label="Name" description="Displayed in the dashboard.">
                <Input name="name" defaultValue={resource.name} required className="w-72" />
              </SettingsRow>
              <SettingsRow label="Description" description="A short summary.">
                <Input
                  name="description"
                  defaultValue={resource.description ?? ""}
                  className="w-72"
                />
              </SettingsRow>
              <SettingsRow label="Slug" description="Reference in the API path.">
                <code className="bg-muted px-2 py-1 text-xs">{resource.slug}</code>
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
              Deleting a resource is permanent.
            </p>
            <div className="border-destructive/40 border">
              <SettingsRow
                label="Delete resource"
                description="Remove this resource, its records, views, and cubes."
              >
                <DeleteResource slug={resource.slug} />
              </SettingsRow>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
