import { headers } from "next/headers"
import { notFound } from "next/navigation"
import type { SchemaModel } from "@hypercube/core"
import { introspect } from "@hypercube/core/postgres"
import {
  ensureStore,
  getCube,
  listRecords,
  listViews,
} from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ExposeTable } from "@/components/expose-table"
import { RecordsTable } from "@/components/records-table"
import { CubeTabs } from "@/components/cube-tabs"
import { ConnectSheet } from "@/components/connect-sheet"
import { PencilIcon } from "lucide-react"
import { saveExposeAction } from "@/lib/actions"
import { instanceDb, targetDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function ManageCube({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, slug)
  if (!cube) notFound()

  const h = await headers()
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? ""}`

  if (cube.source === "internal") {
    const { rows } = await listRecords(db, cube.id, { limit: 100, offset: 0 })
    const views = await listViews(db, cube.id)
    return (
      <>
        <SiteHeader
          title={cube.name}
          action={
            <div className="flex gap-2">
              <ConnectSheet slug={cube.slug} entity={cube.slug} origin={origin} />
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={`/dashboard/cubes/${cube.slug}/edit`} />}
              >
                <PencilIcon />
                Edit
              </Button>
            </div>
          }
        />
        <CubeTabs
          cubeSlug={cube.slug}
          views={views.map((v) => ({ slug: v.slug, name: v.name }))}
        />
        <div className="flex flex-1 flex-col">
          <RecordsTable
            cubeSlug={cube.slug}
            fields={cube.fields}
            rows={rows.map((r) => ({ id: r.id, data: r.data }))}
          />
        </div>
      </>
    )
  }

  let model: SchemaModel = { entities: [] }
  let connectionError = ""
  const target = targetDb(cube.database_url ?? "")
  try {
    model = await introspect(target, cube.schema_name)
  } catch (error) {
    connectionError = error instanceof Error ? error.message : String(error)
  } finally {
    await target.destroy()
  }

  const save = saveExposeAction.bind(null, cube.slug)
  const masked = (cube.database_url ?? "").replace(/\/\/[^@]*@/, "//***@")

  return (
    <>
      <SiteHeader
        title={cube.name}
        action={
          <div className="flex gap-2">
            <ConnectSheet
              slug={cube.slug}
              entity={Object.keys(cube.expose)[0] ?? "table"}
              origin={origin}
            />
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/cubes/${cube.slug}/edit`} />}
            >
              <PencilIcon />
              Edit
            </Button>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="text-muted-foreground text-sm">
          <span className="font-mono">{masked}</span> ({cube.schema_name})
          &middot;{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={`/api/c/${cube.slug}`}
          >
            /api/c/{cube.slug}
          </a>
        </div>
        {connectionError ? (
          <Card>
            <CardHeader>
              <CardTitle>Connection failed</CardTitle>
              <CardDescription>{connectionError}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Exposed entities</CardTitle>
              <CardDescription>
                Checked tables become API resources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={save} className="flex flex-col gap-4">
                <ExposeTable entities={model.entities} exposed={cube.expose} />
                <div>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
