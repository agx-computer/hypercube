import Image from "next/image"

const DEMO_URL = "https://demo.hypercube.sh"
const DOCS_URL = "https://docs.hypercube.sh"
const GITHUB_URL = "https://github.com/agx-computer/hypercube"

const REQUEST = `curl -H "x-api-key: hc_…" \\
  https://api.demo.hypercube.sh/c/<cube>`

const RESPONSE = `# Acme Store Guide

Acme Outdoors is a small outdoor-gear shop. This cube
is the live store context for agents: what we sell,
who buys, and what's moving.

11 products · 12 orders · $1744 revenue

## Pages

- [Products](/c/<cube>/products)
- [Orders](/c/<cube>/orders)
- [Customers](/c/<cube>/customers)`

const STEPS = [
  {
    title: "Connect resources",
    body: "Sync a Postgres schema or curate tables by hand. Rows live in the cube's store and stay fresh.",
  },
  {
    title: "Write pages in JIM",
    body: "Markdown with {{ }} JavaScript over your data. One file per page, plain text all the way down.",
  },
  {
    title: "Serve to agents",
    body: "Every cube is an authenticated markdown API: one URL, an x-api-key header, fresh context.",
  },
]

export default function Home() {
  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={24} height={24} />
          <span className="font-heading text-lg font-semibold">Hypercube</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-neutral-600">
          <a href={DOCS_URL} className="hover:text-neutral-900">
            Docs
          </a>
          <a href={GITHUB_URL} className="hover:text-neutral-900">
            GitHub
          </a>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-col items-start gap-6 py-20 md:py-28">
          <h1 className="font-heading max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            The context transform engine
          </h1>
          <p className="max-w-xl text-lg text-neutral-600">
            Hypercube connects to any data source and turns it into navigable
            markdown pages for agents.
          </p>
          <div className="flex items-center gap-3">
            <a
              href={DEMO_URL}
              className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Try the demo
            </a>
            <a
              href={DOCS_URL}
              className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:border-neutral-500"
            >
              Read the docs
            </a>
          </div>
        </section>

        <section className="flex flex-col gap-4 pb-20">
          <h2 className="font-heading text-sm font-medium tracking-wider text-neutral-500 uppercase">
            What an agent sees
          </h2>
          <div className="grid gap-4 md:grid-cols-[2fr_3fr]">
            <div className="flex flex-col rounded-lg border border-neutral-200">
              <div className="border-b border-neutral-200 px-4 py-2 text-xs text-neutral-500">
                Request
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-neutral-800">
                {REQUEST}
              </pre>
            </div>
            <div className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-50">
              <div className="border-b border-neutral-200 px-4 py-2 text-xs text-neutral-500">
                Response · text/markdown
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-neutral-800">
                {RESPONSE}
              </pre>
            </div>
          </div>
          <p className="text-sm text-neutral-500">
            The numbers in the page are computed from live records at request
            time.
          </p>
        </section>

        <section className="flex flex-col gap-8 pb-24">
          <h2 className="font-heading text-sm font-medium tracking-wider text-neutral-500 uppercase">
            How it works
          </h2>
          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col gap-2">
                <div className="font-mono text-sm text-neutral-400">
                  0{i + 1}
                </div>
                <h3 className="font-heading text-lg font-semibold">
                  {step.title}
                </h3>
                <p className="text-sm leading-6 text-neutral-600">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-between border-t border-neutral-200 py-8 text-sm text-neutral-500">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={16} height={16} />
          <span>Hypercube</span>
        </div>
        <nav className="flex items-center gap-5">
          <a href={DEMO_URL} className="hover:text-neutral-900">
            Demo
          </a>
          <a href={DOCS_URL} className="hover:text-neutral-900">
            Docs
          </a>
          <a href={GITHUB_URL} className="hover:text-neutral-900">
            GitHub
          </a>
        </nav>
      </footer>
    </div>
  )
}
