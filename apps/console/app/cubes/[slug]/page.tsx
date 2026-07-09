import Link from "next/link"
import { notFound } from "next/navigation"
import type { SchemaModel } from "@hypercube/core"
import { introspect } from "@hypercube/core/postgres"
import { ensureStore, getCube } from "@hypercube/core/store"
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
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function CubePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  await requireSession()
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
    <main className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" href="/">
            Hypercube
          </Link>{" "}
          / {cube.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {cube.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {masked} ({cube.schema_name})
        </p>
        <p className="mt-2 text-sm">
          API:{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={`/api/c/${cube.slug}`}
          >
            /api/c/{cube.slug}
          </a>
        </p>
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
            <form action={save} className="space-y-4">
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
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
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
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
