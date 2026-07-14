"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { SiteHeader } from "@/components/site-header"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { SettingsRow } from "@/components/settings-row"
import { DeleteResource } from "@/components/delete-resource"
import { PageError, PageLoading } from "@/components/page-state"
import { api } from "@/lib/api"
import { useResource } from "@/lib/queries"
import { cn } from "@/lib/utils"

export default function EditResourcePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditResource />
    </Suspense>
  )
}

function EditResource() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const tab = useSearchParams().get("tab") ?? undefined
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: resource, error } = useResource(resourceId)
  if (error) return <PageError error={error} />
  if (!resource) return <PageLoading />
  const postgres = resource.source === "postgres"
  const database = postgres && tab === "database"
  const base = `/dashboard/resources/${resource.uuid}/edit`

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["resources"] }),
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] }),
      queryClient.invalidateQueries({ queryKey: ["table", resourceId] }),
    ])

  async function save(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    await api(`/resources/${resourceId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    })
    await invalidate()
    router.push(`/dashboard/resources/${resourceId}`)
  }

  async function saveConnection(formData: FormData) {
    await api(`/resources/${resourceId}`, {
      method: "PATCH",
      body: JSON.stringify({
        database_url: String(formData.get("database_url") ?? "").trim(),
        schema_name: String(formData.get("schema_name") ?? "").trim(),
      }),
    })
    await invalidate()
    router.push(`/dashboard/resources/${resourceId}`)
  }

  const navItem = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        "block px-3 py-2 text-sm font-medium",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  )

  return (
    <>
      <SiteHeader title={`${resource.name} / Edit`} />
      <div className="flex flex-1 gap-8 p-4 md:p-8">
        <nav className="flex w-40 shrink-0 flex-col">
          {navItem(base, "General", !database)}
          {postgres ? navItem(`${base}?tab=database`, "Database", database) : null}
        </nav>
        <div className="flex max-w-2xl flex-1 flex-col gap-10">
          {database ? (
            <section key="database">
              <h2 className="text-lg font-semibold">Database</h2>
              <p className="text-muted-foreground mb-4 text-sm">
                The Postgres connection this resource syncs from.
              </p>
              <form action={saveConnection} className="border-border border">
                <SettingsRow
                  label="Connection URL"
                  description="Postgres connection string."
                >
                  <Input
                    name="database_url"
                    type="url"
                    defaultValue={resource.database_url ?? ""}
                    required
                    className="w-72"
                  />
                </SettingsRow>
                <SettingsRow
                  label="Schema"
                  description="Schema to introspect and sync."
                >
                  <Input
                    name="schema_name"
                    defaultValue={resource.schema_name}
                    placeholder="public"
                    className="w-72"
                  />
                </SettingsRow>
                <div className="bg-muted/40 flex justify-end px-5 py-3">
                  <SubmitButton size="sm">
                    Save & sync
                  </SubmitButton>
                </div>
              </form>
            </section>
          ) : (
            <>
              <section key="general">
                <h2 className="text-lg font-semibold">General</h2>
                <p className="text-muted-foreground mb-4 text-sm">
                  Name and describe this resource.
                </p>
                <form action={save} className="border-border border">
                  <SettingsRow label="ID" description="The resource&apos;s public identifier.">
                    <code className="bg-muted px-2 py-1 text-xs">{resource.uuid}</code>
                  </SettingsRow>
                  <SettingsRow label="Name" description="Displayed in the dashboard.">
                    <Input name="name" defaultValue={resource.name} required className="w-72" />
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
                  Deleting a resource is permanent.
                </p>
                <div className="border-destructive/40 border">
                  <SettingsRow
                    label="Delete resource"
                    description="Remove this resource, its records, views, and cubes."
                  >
                    <DeleteResource resourceId={resource.uuid} />
                  </SettingsRow>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  )
}
