import { ensureStore, listCubes } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createCubeAction } from "@/lib/actions"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const db = instanceDb()
  await ensureStore(db)
  const cubes = await listCubes(db)
  return (
    <>
      <SiteHeader title="Cubes" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>New cube</CardTitle>
            <CardDescription>
              Point Hypercube at a Postgres database and choose what to expose.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCubeAction}>
              <FieldGroup className="max-w-lg">
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" name="name" placeholder="Coffee Store" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="slug">Slug</FieldLabel>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="store"
                    pattern="[a-z0-9-]+"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="database_url">Database URL</FieldLabel>
                  <Input
                    id="database_url"
                    name="database_url"
                    type="url"
                    placeholder="postgres://user:pass@host:5432/db"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="schema_name">Schema</FieldLabel>
                  <Input id="schema_name" name="schema_name" placeholder="public" />
                </Field>
                <Field>
                  <Button type="submit">Create cube</Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        {cubes.length > 0 ? (
          <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            {cubes.map((cube) => (
              <Card key={cube.slug}>
                <CardHeader>
                  <CardTitle>{cube.name}</CardTitle>
                  <CardDescription>
                    {Object.keys(cube.expose).length} exposed entities
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    render={<a href={`/dashboard/cubes/${cube.slug}`} />}
                  >
                    Manage
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    render={<a href={`/api/c/${cube.slug}`} />}
                  >
                    API
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
