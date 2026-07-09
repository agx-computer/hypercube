import { notFound } from "next/navigation"
import Link from "next/link"
import { ensureStore, getCube } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SettingsRow } from "@/components/settings-row"
import { DeleteCube } from "@/components/delete-cube"
import { updateCubeAction } from "@/lib/actions"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

const NAV = [{ key: "general", label: "General" }]

export default async function EditCube({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, slug)
  if (!cube) notFound()
  const save = updateCubeAction.bind(null, cube.slug)

  return (
    <>
      <SiteHeader title={`${cube.name} / Edit`} />
      <div className="flex flex-1 gap-8 p-4 md:p-8">
        <nav className="w-40 shrink-0">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={`/dashboard/cubes/${cube.slug}/edit`}
                  className="bg-muted text-foreground block px-3 py-2 text-sm font-medium"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex max-w-2xl flex-1 flex-col gap-10">
          <section>
            <h2 className="text-lg font-semibold">General</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Name and describe this cube.
            </p>
            <form action={save} className="border-border border">
              <SettingsRow
                label="Name"
                description="Displayed throughout the dashboard."
              >
                <Input
                  name="name"
                  defaultValue={cube.name}
                  required
                  className="w-72"
                />
              </SettingsRow>
              <SettingsRow
                label="Description"
                description="A short summary of this cube."
              >
                <Input
                  name="description"
                  defaultValue={cube.description ?? ""}
                  className="w-72"
                />
              </SettingsRow>
              <SettingsRow
                label="Slug"
                description="Reference used in the API path."
              >
                <code className="bg-muted px-2 py-1 text-xs">{cube.slug}</code>
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
              Deleting a cube is permanent.
            </p>
            <div className="border-destructive/40 border">
              <SettingsRow
                label="Delete cube"
                description="Remove this cube and all its records."
              >
                <DeleteCube slug={cube.slug} name={cube.name} />
              </SettingsRow>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
