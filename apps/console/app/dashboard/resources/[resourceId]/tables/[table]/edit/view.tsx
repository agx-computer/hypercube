"use client"

import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { SiteHeader } from "@/components/site-header"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { SettingsRow } from "@/components/settings-row"
import { DeleteTable } from "@/components/delete-table"
import { PageError, PageLoading } from "@/components/page-state"
import { api } from "@/lib/api"
import { useResource, useTable } from "@/lib/queries"

export default function EditTablePage() {
  const { resourceId, table: tableSlug } = useParams<{
    resourceId: string
    table: string
  }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const resource = useResource(resourceId)
  const table = useTable(resourceId, tableSlug)
  if (resource.error || table.error) {
    return <PageError error={resource.error ?? table.error} />
  }
  if (!resource.data || !table.data) return <PageLoading />
  if (resource.data.source !== "internal") {
    return <PageError error={new Error("Not found.")} />
  }

  async function save(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    await api(`/resources/${resourceId}/tables/${tableSlug}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["resources"] }),
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] }),
      queryClient.invalidateQueries({
        queryKey: ["table", resourceId, tableSlug],
      }),
    ])
    router.push(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
  }

  return (
    <>
      <SiteHeader
        title={`${resource.data.name} / ${table.data.name} / Edit`}
      />
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
                  defaultValue={table.data.name}
                  required
                  className="w-72"
                />
              </SettingsRow>
              <SettingsRow label="Slug" description="Reference in URLs and pages.">
                <code className="bg-muted px-2 py-1 text-xs">
                  {table.data.slug}
                </code>
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
              Deleting a table is permanent.
            </p>
            <div className="border-destructive/40 border">
              <SettingsRow
                label="Delete table"
                description="Remove this table, its records, and views."
              >
                <DeleteTable resourceId={resourceId} tableSlug={tableSlug} />
              </SettingsRow>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
