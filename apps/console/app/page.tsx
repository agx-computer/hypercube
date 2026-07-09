import Link from "next/link"
import { ensureStore, listCubes } from "@hypercube/core/store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SignOut } from "@/components/sign-out"
import { createCubeAction } from "@/lib/actions"
import { instanceDb } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cubes = await listCubes(db)
  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hypercube</h1>
          <p className="text-sm text-muted-foreground">
            Connect a data source and turn it into navigable Markdown for
            agents.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {session.user.email}
          <SignOut />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cubes</CardTitle>
          <CardDescription>
            Every cube serves its source as a generated API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cubes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cubes yet. Create the first one below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Exposed</TableHead>
                  <TableHead>API</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cubes.map((cube) => (
                  <TableRow key={cube.slug}>
                    <TableCell className="font-medium">{cube.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {cube.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      {Object.keys(cube.expose).length} entities
                    </TableCell>
                    <TableCell>
                      <a
                        className="text-primary underline-offset-4 hover:underline"
                        href={`/api/c/${cube.slug}`}
                      >
                        /api/c/{cube.slug}
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/cubes/${cube.slug}`}>Manage</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New cube</CardTitle>
          <CardDescription>
            Point it at a Postgres database and pick what to expose.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-lg gap-4" action={createCubeAction}>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Coffee Store" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="store"
                pattern="[a-z0-9-]+"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="database_url">Database URL</Label>
              <Input
                id="database_url"
                name="database_url"
                type="url"
                placeholder="postgres://user:pass@host:5432/db"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schema_name">Schema</Label>
              <Input id="schema_name" name="schema_name" placeholder="public" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="What this data is"
              />
            </div>
            <div>
              <Button type="submit">Create cube</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
