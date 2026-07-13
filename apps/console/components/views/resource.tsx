"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeleteResourceMenu } from "@/components/delete-resource"
import { SyncResource } from "@/components/sync-resource"
import { ViewFallback } from "@/components/views/fallback"
import type { ResourceData } from "@/lib/api-types"
import { useData } from "@/lib/data"
import { PencilIcon, PlusIcon } from "lucide-react"

export function ResourceView() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const { data, error } = useData<ResourceData>(
    `/api/resources/${encodeURIComponent(resourceId)}`,
  )
  if (!data) return <ViewFallback error={error} />
  const { resource, tables } = data
  const internal = resource.source === "internal"
  return (
    <>
      <SiteHeader
        title={resource.name}
        action={
          <div className="flex items-center gap-2">
            {internal ? (
              <Button
                size="sm"
                nativeButton={false}
                render={
                  <Link
                    href={`/dashboard/resources/${resource.uuid}/tables/new`}
                  />
                }
              >
                <PlusIcon />
                New table
              </Button>
            ) : (
              <SyncResource resourceId={resource.uuid} />
            )}
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/dashboard/resources/${resource.uuid}/edit`} />
              }
            >
              <PencilIcon />
              Edit
            </Button>
            <DeleteResourceMenu resourceId={resource.uuid} />
          </div>
        }
      />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        {tables.length === 0 ? (
          internal ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 border border-dashed py-20">
              <p className="text-muted-foreground text-sm">
                This resource has no tables yet.
              </p>
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/dashboard/resources/${resource.uuid}/tables/new`}
                  />
                }
              >
                <PlusIcon />
                New table
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No tables yet. Sync to pull the schema and sample rows.
            </p>
          )
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  {internal ? null : (
                    <TableHead className="w-40 text-right">Synced</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table) => (
                  <TableRow key={table.slug}>
                    <TableCell className="h-10 py-0 font-medium">
                      <Link
                        href={`/dashboard/resources/${resource.uuid}/tables/${table.slug}`}
                        className="hover:underline"
                      >
                        {table.name}
                      </Link>
                    </TableCell>
                    {internal ? null : (
                      <TableCell className="text-muted-foreground h-10 py-0 text-right">
                        {table.synced_at
                          ? format(new Date(table.synced_at), "MMM d, HH:mm")
                          : "—"}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  )
}
