import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AuthForm } from "@/components/auth-form"
import { auth } from "@/lib/auth"
import { hasUsers } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/")
  const setup = !(await hasUsers())
  return (
    <main className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Hypercube</CardTitle>
          <CardDescription>
            {setup
              ? "First run. Create the admin account."
              : "Sign in to manage cubes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode={setup ? "setup" : "signin"} />
        </CardContent>
      </Card>
    </main>
  )
}
