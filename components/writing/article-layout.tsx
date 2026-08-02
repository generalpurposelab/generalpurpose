import type { ReactNode } from "react"

import { ArticleMinimap } from "@/components/article-minimap"
import { BackLink } from "@/components/back-link"
import { dipFontVariables } from "@/lib/dip-fonts"
import type { WritingMetadata, WritingSection } from "@/lib/writing"

function articleDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

export function WritingArticleLayout({
  metadata,
  sections,
  children,
}: {
  metadata: WritingMetadata
  sections: readonly WritingSection[]
  children: ReactNode
}) {
  return (
    <div className={`dip-page dip-page--interview ${dipFontVariables}`}>
      <aside className="dip-aside">
        <BackLink label="Home" />
        <div className="dip-toc">
          <ArticleMinimap sections={sections} />
        </div>
      </aside>

      <main>
        <article className="dip-article dip-interview">
          <header>
            <h1>{metadata.title}</h1>
            <time dateTime={metadata.date}>{articleDate(metadata.date)}</time>
          </header>
          {children}
        </article>
      </main>
    </div>
  )
}
