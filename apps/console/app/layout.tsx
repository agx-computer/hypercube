import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Hypercube",
  description:
    "Connect a data source and turn it into navigable Markdown for agents.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="mx-auto max-w-4xl px-6 py-10 antialiased">
        {children}
      </body>
    </html>
  )
}
