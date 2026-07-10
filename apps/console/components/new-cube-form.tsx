"use client"

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

export function NewCube({
  options,
}: {
  options: { id: number; label: string }[]
}) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>New cube</CardTitle>
        <CardDescription>
          Pick a resource view. The cube renders its data as agent pages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createCubeAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" placeholder="Docs" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="view_id">Source view</FieldLabel>
              <select
                id="view_id"
                name="view_id"
                className="border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                required
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <Button type="submit">Create cube</Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
