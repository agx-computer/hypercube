import { SiteHeader } from "@/components/site-header"
import { NewCube } from "@/components/new-cube-form"

export default async function NewCubePage() {
  return (
    <>
      <SiteHeader title="New cube" />
      <div className="flex flex-1 flex-col items-center gap-6 p-4 md:p-8">
        <NewCube />
      </div>
    </>
  )
}
