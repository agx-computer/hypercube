import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getResource } from "@hypercube/core/store"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { SiteHeader } from "@/components/site-header"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { SettingsRow } from "@/components/settings-row"
import { DeleteResource } from "@/components/delete-resource"
import {
  updateResourceAction,
  updateResourceConnectionAction,
} from "@/lib/actions"
import { instanceDb } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { cn } from "@/lib/utils"

export default function EditResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resourceId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EditResource params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function EditResource({
  params,
  searchParams,
}: {
  params: Promise<{ resourceId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  await requireSession()
  const { resourceId } = await params
  const { tab } = await searchParams
  const db = instanceDb()
  const resource = await getResource(db, resourceId)
  if (!resource) notFound()
  const postgres = resource.source === "postgres"
  const database = postgres && tab === "database"
  const base = `/dashboard/resources/${resource.uuid}/edit`
  const save = updateResourceAction.bind(null, resource.uuid)
  const saveConnection = updateResourceConnectionAction.bind(
    null,
    resource.uuid,
  )

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
