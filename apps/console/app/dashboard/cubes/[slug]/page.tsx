import { notFound } from "next/navigation"
import type { SchemaModel } from "@hypercube/core"
import { introspect } from "@hypercube/core/postgres"
import { ensureStore, getCube } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

  let model: SchemaModel = { entities: [] }
  let connectionError = ""
  const target = targetDb(cube.database_url)
  try {
    model = await introspect(target, cube.schema_name)
  } catch (error) {
    connectionError = error instanceof Error ? error.message : String(error)
  } finally {
    await target.destroy()
  }

  const save = saveExposeAction.bind(null, cube.slug)
  const masked = cube.database_url.replace(/\/\/[^@]*@/, "//***@")

  return (
    <>
      <SiteHeader title={cube.name} />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="text-muted-foreground text-sm">
          <span className="font-mono">{masked}</span> ({cube.schema_name}) &middot;{" "}
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
                Checked tables become API resources. Everything else stays
                invisible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={save} className="flex flex-col gap-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Table</TableHead>
                      <TableHead>Fields</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {model.entities.map((entity) => (
                      <TableRow key={entity.name}>
                        <TableCell>
                          <Checkbox
                            name="expose"
                            value={entity.name}
                            defaultChecked={entity.name in cube.expose}
                          />
                        </TableCell>
                        <TableCell>
                          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                            {entity.name}
                          </code>
                        </TableCell>
                        <TableCell>{entity.fields.length}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {entity.description ?? ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
