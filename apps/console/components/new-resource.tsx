"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SubmitButton } from "@/components/submit-button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"

type ResourceType = "static" | "dynamic"

export function NewResource() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [type, setType] = useState<ResourceType>("static")
  const [busy, setBusy] = useState(false)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["resources"] })

  async function createStatic(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const created = await api<{ uuid: string }>("/resources", {
      method: "POST",
      body: JSON.stringify({ name, source: "internal" }),
    })
    await invalidate()
    router.push(`/dashboard/resources/${created.uuid}`)
  }

  async function createDynamic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const created = await api<{ uuid: string }>("/resources", {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("name") ?? "").trim(),
          source: "postgres",
          database_url: String(formData.get("database_url") ?? "").trim(),
          schema_name: String(formData.get("schema_name") ?? "").trim(),
        }),
      })
      const id = toast.loading("Syncing…")
      await invalidate()
      router.push(`/dashboard/resources/${created.uuid}`)
      api<{ tables: number }>(`/resources/${created.uuid}/sync`, {
        method: "POST",
      })
        .then(async (result) => {
          toast.success(
            result.tables === 1
              ? "Synced 1 table"
              : `Synced ${result.tables} tables`,
            { id },
          )
          await invalidate()
          await queryClient.invalidateQueries({
            queryKey: ["resource", created.uuid],
          })
        })
        .catch((error) => {
          toast.error(`Sync failed: ${String(error.message ?? error)}`, { id })
        })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>New resource</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={type === "static" ? createStatic : undefined}
          onSubmit={type === "dynamic" ? createDynamic : undefined}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" placeholder="My data" required />
            </Field>
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Tabs
                value={type}
                onValueChange={(v) => setType(v as ResourceType)}
              >
                <TabsList>
                  <TabsTrigger value="static">Static</TabsTrigger>
                  <TabsTrigger value="dynamic">Dynamic</TabsTrigger>
                </TabsList>
              </Tabs>
            </Field>

            {type === "dynamic" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="database_url">
                    Postgres connection URL
                  </FieldLabel>
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
                  <Input
                    id="schema_name"
                    name="schema_name"
                    placeholder="public"
                  />
                </Field>
              </>
            ) : null}

            <Field>
              <SubmitButton busy={busy}>Create resource</SubmitButton>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
