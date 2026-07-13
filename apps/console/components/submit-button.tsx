"use client"

import { useFormStatus } from "react-dom"
import { LoaderCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SubmitButton({
  busy = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { busy?: boolean }) {
  const { pending } = useFormStatus()
  const active = pending || busy
  return (
    <Button type="submit" disabled={active || disabled} {...props}>
      {active ? <LoaderCircleIcon className="animate-spin" /> : null}
      {children}
    </Button>
  )
}
