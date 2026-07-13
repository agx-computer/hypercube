"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/submit-button"
import { createCubeAction } from "@/lib/actions"

export function NewCube() {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>New cube</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createCubeAction}>
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
