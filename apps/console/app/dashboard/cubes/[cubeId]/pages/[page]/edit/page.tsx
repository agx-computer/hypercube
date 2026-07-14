import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCube, getPage } from "@hypercube/core/store"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { SiteHeader } from "@/components/site-header"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { SettingsRow } from "@/components/settings-row"
import { DeletePageButton } from "@/components/delete-page"
import { updatePageMetaAction } from "@/lib/actions"
import { instanceDb } from "@/lib/db"
import { requireSession } from "@/lib/session"

export default function EditPageMetaPage({
  params,
}: {
  params: Promise<{ cubeId: string; page: string }>
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EditPage params={params} />
    </Suspense>
  )
}

async function EditPage({
  params,
}: {
  params: Promise<{ cubeId: string; page: string }>
}) {
  await requireSession()
  const { cubeId, page: pageSlug } = await params
  const db = instanceDb()
  const cube = await getCube(db, cubeId)
  if (!cube) notFound()
  const page = await getPage(db, cube.id, pageSlug)
  if (!page) notFound()
  const save = updatePageMetaAction.bind(null, cube.uuid, page.slug)

  return (
    <>
      <SiteHeader title={`${cube.name} / ${page.name} / Edit`} />
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
              Name this page.
            </p>
            <form action={save} className="border-border border">
              <SettingsRow label="Name" description="Displayed in the dashboard.">
                <Input
                  name="name"
                  defaultValue={page.name}
                  required
                  className="w-72"
                />
              </SettingsRow>
              <SettingsRow label="Slug" description="Reference in the page URL.">
                <code className="bg-muted px-2 py-1 text-xs">{page.slug}</code>
              </SettingsRow>
              <div className="bg-muted/40 flex justify-end px-5 py-3">
                <SubmitButton size="sm">
                  Save changes
                </SubmitButton>
              </div>
            </form>
          </section>

          <section>
            <h2 className="text-destructive text-lg font-semibold">
              Danger zone
            </h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Deleting a page is permanent.
            </p>
            <div className="border-destructive/40 border">
              <SettingsRow
                label="Delete page"
                description="Remove this page from the cube."
              >
                <DeletePageButton cubeId={cube.uuid} pageSlug={page.slug} />
              </SettingsRow>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
