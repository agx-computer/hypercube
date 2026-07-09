import type { ReactNode } from "react"

export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="border-border flex items-center justify-between gap-6 border-b px-5 py-4 last:border-b-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <div className="text-muted-foreground text-sm">{description}</div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
