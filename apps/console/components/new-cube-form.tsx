"use client"

import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/submit-button"
import { api } from "@/lib/api"

export function NewCube() {
  const router = useRouter()
  const queryClient = useQueryClient()

  async function create(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const created = await api<{ uuid: string }>("/cubes", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
    await queryClient.invalidateQueries({ queryKey: ["cubes"] })
    router.push(`/dashboard/cubes/${created.uuid}`)
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>New cube</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={create}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" placeholder="Docs" required />
            </Field>
            <Field>
              <SubmitButton>Create cube</SubmitButton>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
