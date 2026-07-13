import { SiteHeader } from "@/components/site-header"
import { NewResource } from "@/components/new-resource"

export default function NewResourcePage() {
  return (
    <>
      <SiteHeader title="New resource" />
      <div className="flex flex-1 flex-col items-center gap-6 p-4 md:p-8">
        <NewResource />
      </div>
    </>
  )
}
