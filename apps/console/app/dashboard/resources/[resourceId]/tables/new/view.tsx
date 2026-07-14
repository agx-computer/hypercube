"use client"

import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
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
import { PageError, PageLoading } from "@/components/page-state"
import { api } from "@/lib/api"
import { useResource } from "@/lib/queries"

export default function NewTablePage() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: resource, error } = useResource(resourceId)
  if (error) return <PageError error={error} />
  if (!resource) return <PageLoading />
  if (resource.source !== "internal") {
    return <PageError error={new Error("Not found.")} />
  }

  async function create(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const created = await api<{ slug: string }>(
      `/resources/${resourceId}/tables`,
      { method: "POST", body: JSON.stringify({ name }) },
    )
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["resources"] }),
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] }),
    ])
    router.push(`/dashboard/resources/${resourceId}/tables/${created.slug}`)
  }

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
