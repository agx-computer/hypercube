"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  createInternalResourceAction,
  createPostgresResourceAction,
  syncResourceAction,
} from "@/lib/actions"

type ResourceType = "static" | "dynamic"

export function NewResource() {
  const router = useRouter()
  const [type, setType] = useState<ResourceType>("static")
  const [busy, setBusy] = useState(false)

  async function createDynamic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const created = await createPostgresResourceAction(formData)
      const id = toast.loading("Syncing…")
      router.push(`/dashboard/resources/${created.uuid}`)
      syncResourceAction(created.uuid)
        .then((result) => {
          if ("error" in result) {
            toast.error(`Sync failed: ${result.error}`, { id })
            return
          }
          toast.success(
            result.tables === 1
              ? "Synced 1 table"
              : `Synced ${result.tables} tables`,
            { id },
          )
          startTransition(() => router.refresh())
        })
        .catch((error) => {
          toast.error(`Sync failed: ${String(error)}`, { id })
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
          action={type === "static" ? createInternalResourceAction : undefined}
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
              <Button type="submit" disabled={busy}>
                Create resource
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
