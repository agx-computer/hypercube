import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import { PlusIcon } from "lucide-react"

export function Tile({
  href,
  name,
  preview,
  icon: Icon,
  badge,
}: {
  href: string
  name: string
  preview?: string
  icon?: ComponentType<{ className?: string }>
  badge?: ReactNode
}) {
  return (
    <Link href={href} className="group flex flex-col gap-1.5">
      <div className="bg-card group-hover:border-ring aspect-[3/4] overflow-hidden rounded-md border p-2.5 shadow-xs transition-colors">
        {Icon ? (
          <div className="flex h-full items-center justify-center">
            <Icon className="text-muted-foreground size-8" />
          </div>
        ) : (
          <div className="text-muted-foreground font-mono text-[6px] leading-[10px] break-words whitespace-pre-wrap">
            {preview}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-0.5">
        {name ? (
          <span className="truncate text-xs font-medium">{name}</span>
        ) : null}
        {badge}
      </div>
    </Link>
  )
}

export function NewTile({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group flex flex-col gap-1.5">
      <div className="text-muted-foreground group-hover:border-ring group-hover:text-foreground flex aspect-[3/4] w-full items-center justify-center rounded-md border border-dashed transition-colors">
        <PlusIcon className="size-5" />
      </div>
      <span className="text-muted-foreground px-0.5 text-xs font-medium">
        {label}
      </span>
    </Link>
  )
}
