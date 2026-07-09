"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function SignupForm({
  mode,
  className,
  ...props
}: { mode: "setup" | "signin" } & React.ComponentProps<"div">) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(formData: FormData) {
    setBusy(true)
    setError("")
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")
    const result =
      mode === "setup"
        ? await authClient.signUp.email({
            email,
            password,
            name: String(formData.get("name") ?? "") || email,
          })
        : await authClient.signIn.email({ email, password })
    setBusy(false)
    if (result.error) {
      setError(result.error.message ?? "Something went wrong")
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form action={submit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center">
              <Image src="/logo.png" alt="Hypercube" width={40} height={40} />
            </div>
            <h1 className="text-xl font-bold">
              {mode === "setup" ? "Set up Hypercube" : "Welcome back"}
            </h1>
            <FieldDescription>
              {mode === "setup"
                ? "Create the admin account for this instance."
                : "Sign in to manage your cubes."}
            </FieldDescription>
          </div>
          {mode === "setup" ? (
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" placeholder="Ada" />
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
            />
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
          <Field>
            <Button type="submit" disabled={busy}>
              {mode === "setup" ? "Create admin account" : "Sign in"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
