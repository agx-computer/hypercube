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
import {
  createInternalResourceAction,
  createPostgresResourceAction,
} from "@/lib/actions"

type ResourceType = "static" | "dynamic"

const ACTIONS = {
  static: createInternalResourceAction,
  dynamic: createPostgresResourceAction,
}

export function NewResource() {
  const [type, setType] = useState<ResourceType>("static")

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>New resource</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={ACTIONS[type]}>
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
              <Button type="submit">Create resource</Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
