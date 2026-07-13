"use client"

import { useParams } from "next/navigation"
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
import { ViewFallback } from "@/components/views/fallback"
import { createTableAction } from "@/lib/actions"
import type { ResourceData } from "@/lib/api-types"
import { useData } from "@/lib/data"

export function TableNewView() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const { data, error } = useData<ResourceData>(
    `/api/resources/${encodeURIComponent(resourceId)}`,
  )
  if (!data) return <ViewFallback error={error} />
  const { resource } = data
  if (resource.source !== "internal") {
    return <ViewFallback error={{ notFound: true }} />
  }
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
