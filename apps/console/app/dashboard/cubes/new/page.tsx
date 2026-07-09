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

export const dynamic = "force-dynamic"

export default function NewCubePage() {
  return (
    <>
      <SiteHeader title="New cube" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>New cube</CardTitle>
            <CardDescription>
              Point Hypercube at a Postgres database and choose what to expose.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCubeAction}>
              <FieldGroup>
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
      </div>
    </>
  )
}
