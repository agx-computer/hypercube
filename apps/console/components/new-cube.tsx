"use client"

import { useState } from "react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createCubeAction, createInternalCubeAction } from "@/lib/actions"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function NewCube() {
  const [type, setType] = useState<"static" | "dynamic">("static")
  const [slug, setSlug] = useState("")
  const [edited, setEdited] = useState(false)

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>New cube</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={
            type === "static" ? createInternalCubeAction : createCubeAction
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                placeholder="My cube"
                required
                onChange={(e) => {
                  if (!edited) setSlug(slugify(e.target.value))
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="slug">Slug</FieldLabel>
              <Input
                id="slug"
                name="slug"
                placeholder="my-cube"
                pattern="[a-z0-9-]+"
                required
                value={slug}
                onChange={(e) => {
                  setEdited(true)
                  setSlug(e.target.value)
                }}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" />
            </Field>

            <Field>
              <FieldLabel>Type</FieldLabel>
              <Tabs
                value={type}
                onValueChange={(v) => setType(v as "static" | "dynamic")}
              >
                <TabsList>
                  <TabsTrigger value="static">Static</TabsTrigger>
                  <TabsTrigger value="dynamic">Dynamic</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-muted-foreground text-sm">
                {type === "static"
                  ? "Define collections and enter records by hand."
                  : "Connect an external database, read live."}
              </p>
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
              <Button type="submit">Create cube</Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
