"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

export function AuthForm({ mode }: { mode: "setup" | "signin" }) {
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
      setError(result.error.message ?? "failed")
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <form className="grid gap-4" action={submit}>
      {mode === "setup" ? (
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Ada" />
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {mode === "setup" ? "Create admin account" : "Sign in"}
      </Button>
    </form>
  )
}
