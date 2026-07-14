"use client"

import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { SiteHeader } from "@/components/site-header"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { SettingsRow } from "@/components/settings-row"
import { DeletePageButton } from "@/components/delete-page"
import { PageError, PageLoading } from "@/components/page-state"
import { api } from "@/lib/api"
import { useCube } from "@/lib/queries"

export default function EditPageMetaPage() {
  const { cubeId, page: pageSlug } = useParams<{
    cubeId: string
    page: string
  }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: cube, error } = useCube(cubeId)
  if (error) return <PageError error={error} />
  if (!cube) return <PageLoading />
  const page = cube.pages.find((p) => p.slug === pageSlug)
  if (!page) return <PageError error={new Error("Not found.")} />

  async function save(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    await api(`/cubes/${cubeId}/pages/${pageSlug}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cubes"] }),
      queryClient.invalidateQueries({ queryKey: ["cube", cubeId] }),
    ])
    router.push(`/dashboard/cubes/${cubeId}/pages/${pageSlug}`)
  }

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
