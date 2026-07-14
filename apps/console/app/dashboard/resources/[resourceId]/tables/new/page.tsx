import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getResource } from "@hypercube/core/store"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { SiteHeader } from "@/components/site-header"
import { SubmitButton } from "@/components/submit-button"
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
import { requireSession } from "@/lib/session"

export default function NewTablePage({
  params,
}: {
  params: Promise<{ resourceId: string }>
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <NewTable params={params} />
    </Suspense>
  )
}

async function NewTable({
  params,
}: {
  params: Promise<{ resourceId: string }>
}) {
  await requireSession()
  const { resourceId } = await params
  const db = instanceDb()
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
                  <SubmitButton>Create table</SubmitButton>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
