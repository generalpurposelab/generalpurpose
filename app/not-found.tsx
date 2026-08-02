import type { Metadata } from "next"

import { BackLink } from "@/components/back-link"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="dip-page">
      <aside className="dip-aside">
        <BackLink label="Home" />
      </aside>

      <main>
        <article className="dip-article">
          <header>
            <h1>Page not found</h1>
          </header>
          <p>The page you&apos;re looking for does not exist or has moved.</p>
        </article>
      </main>
    </div>
  )
}
