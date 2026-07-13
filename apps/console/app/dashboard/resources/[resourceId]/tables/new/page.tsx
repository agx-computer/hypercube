import { notFound } from "next/navigation"
import { ensureStore, getResource } from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createTableAction } from "@/lib/actions"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function NewTablePage({
  params,
}: {
  params: Promise<{ resourceId: string }>
}) {
  const { resourceId } = await params
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceId)
  if (!resource || resource.source !== "internal") notFound()
  const create = createTableAction.bind(null, resource.uuid)

  return (
    <>
      <SiteHeader title={`${resource.name} / New table`} />
      <div className="flex flex-1 flex-col items-center gap-6 p-4 md:p-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>New table</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={create}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Orders"
                    required
                    autoFocus
                  />
                </Field>
                <Field>
                  <Button type="submit">Create table</Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
