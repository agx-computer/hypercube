import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"

const geistHeading = Geist({ subsets: ["latin"], variable: "--font-heading" })
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Hypercube",
  description:
    "The context transform engine: connect any data source and turn it into navigable markdown pages for agents.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`antialiased font-sans ${inter.variable} ${geistHeading.variable} ${geistMono.variable}`}
    >
      <body className="bg-white text-neutral-900">{children}</body>
    </html>
  )
}
