import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCube } from "@hypercube/core/store"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { SiteHeader } from "@/components/site-header"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { SettingsRow } from "@/components/settings-row"
import { DeleteCubeButton } from "@/components/delete-cube"
import { updateCubeAction } from "@/lib/actions"
import { instanceDb } from "@/lib/db"
import { requireSession } from "@/lib/session"

export default function EditCubePage({
  params,
}: {
  params: Promise<{ cubeId: string }>
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EditCube params={params} />
    </Suspense>
  )
}

async function EditCube({ params }: { params: Promise<{ cubeId: string }> }) {
  await requireSession()
  const { cubeId } = await params
  const db = instanceDb()
  const cube = await getCube(db, cubeId)
  if (!cube) notFound()
  const save = updateCubeAction.bind(null, cube.uuid)

  return (
    <>
      <SiteHeader title={`${cube.name} / Edit`} />
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
              Name this cube.
            </p>
            <form action={save} className="border-border border">
              <SettingsRow label="ID" description="The cube&apos;s public identifier.">
                <code className="bg-muted px-2 py-1 text-xs">{cube.uuid}</code>
              </SettingsRow>
              <SettingsRow label="Name" description="Displayed in the dashboard.">
                <Input
                  name="name"
                  defaultValue={cube.name}
                  required
                  className="w-72"
                />
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
              Deleting a cube is permanent.
            </p>
            <div className="border-destructive/40 border">
              <SettingsRow
                label="Delete cube"
                description="Remove this cube and all of its pages."
              >
                <DeleteCubeButton cubeId={cube.uuid} />
              </SettingsRow>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
